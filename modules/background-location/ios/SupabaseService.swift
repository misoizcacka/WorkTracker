import Foundation

final class SupabaseService {
  /// Outcome of a single upload attempt. Only `.success` and `.rejected` change the row's status.
  /// `.retryable` leaves the row queued (synced = 0) so a later flush tries again.
  private enum PushResult {
    case success
    case retryable
    case rejected
  }

  /// HTTP codes PostgREST returns for errors that a retry won't fix (RAISE EXCEPTION,
  /// invalid input, conflicts). Everything else (401/403/404/408/429/5xx, network errors)
  /// is treated as temporary.
  private static let permanentHttpCodes: Set<Int> = [400, 409, 422]

  private let config: SupabaseConfig
  private let authenticator: DeviceAuthenticator
  private let dbHelper = LocationDbHelper.shared
  private let session: URLSession
  private let formatter: ISO8601DateFormatter

  init(config: SupabaseConfig, authenticator: DeviceAuthenticator, session: URLSession = .shared) {
    self.config = config
    self.authenticator = authenticator
    self.session = session
    self.formatter = ISO8601DateFormatter()
    self.formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    self.formatter.timeZone = TimeZone(secondsFromGMT: 0)
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /// Insert the event into the local DB and attempt to push it immediately.
  /// Returns true if the event was accepted by the server.
  func sendEvent(_ event: LocationEventRecord) async -> Bool {
    guard dbHelper.insertLocationEvent(event) else {
      NSLog("SupabaseService: skipping \(event.type) for assignment \(event.assignmentId) — local insert rejected (duplicate)")
      return false
    }
    return await push(event) == .success
  }

  /// Flush unsynced events from the local DB, oldest first.
  /// Mirrors Android SupabaseService.flushPendingEvents():
  ///   - `.success`: row marked synced.
  ///   - `.rejected` (permanent 4xx): row moved to the rejected status so it doesn't block the queue.
  ///   - `.retryable` (network error, 5xx, credentials unavailable e.g. phone locked): the flush stops
  ///     and the row stays queued. The same condition would hit every following row, and continuing
  ///     would re-read the same rows forever.
  /// Returns the number of events successfully pushed.
  @discardableResult
  func flushPendingEvents(limit: Int = 25) async -> Int {
    var totalFlushed = 0
    var totalRejected = 0

    flush: while true {
      let pending = dbHelper.unsyncedEvents(limit: limit)
      guard !pending.isEmpty else { break }

      NSLog("SupabaseService: flushPendingEvents — flushing batch of \(pending.count)")

      for event in pending {
        switch await push(event) {
        case .success:
          totalFlushed += 1
        case .rejected:
          totalRejected += 1
        case .retryable:
          NSLog("SupabaseService: flushPendingEvents — temporary failure, stopping. Remaining events stay queued.")
          break flush
        }
      }
    }

    NSLog("SupabaseService: flushPendingEvents — flushed \(totalFlushed), rejected \(totalRejected)")
    return totalFlushed
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /// Attempt to push a single persisted event and record the outcome in the local DB.
  private func push(_ event: LocationEventRecord) async -> PushResult {
    // The Keychain can be unreadable (e.g. before first unlock after a reboot). That is temporary.
    guard let deviceToken = authenticator.deviceToken else {
      NSLog("SupabaseService: no device token available — event \(event.id) stays queued for retry")
      return .retryable
    }

    let body: Data
    switch buildRequestBody(event: event, deviceToken: deviceToken) {
    case .success(let data):
      body = data
    case .failure(let error):
      switch error {
      case .secretUnavailable:
        NSLog("SupabaseService: device secret unavailable — event \(event.id) stays queued for retry")
        return .retryable
      case .serializationFailed:
        // A row that can't be encoded will never succeed; don't let it block the queue.
        NSLog("SupabaseService: event \(event.id) can't be serialized — marking rejected")
        dbHelper.markRejected(id: event.id)
        return .rejected
      }
    }

    guard let requestURL = URL(string: config.url + "/rest/v1/rpc/insert_location_event") else {
      NSLog("SupabaseService: invalid Supabase URL — event \(event.id) stays queued for retry")
      return .retryable
    }

    var request = URLRequest(url: requestURL)
    request.httpMethod = "POST"
    request.setValue(config.key, forHTTPHeaderField: "apikey")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = body
    request.timeoutInterval = 15

    let response: URLResponse
    do {
      let (_, urlResponse) = try await session.data(for: request)
      response = urlResponse
    } catch {
      // No connectivity, timeout, DNS failure, etc.
      NSLog("SupabaseService: network error for event \(event.id): \(error.localizedDescription) — stays queued for retry")
      return .retryable
    }

    guard let httpResponse = response as? HTTPURLResponse else {
      return .retryable
    }

    let status = httpResponse.statusCode
    if (200..<300).contains(status) {
      dbHelper.markSynced(id: event.id)
      return .success
    }
    if SupabaseService.permanentHttpCodes.contains(status) {
      NSLog("SupabaseService: server permanently rejected event \(event.id) (HTTP \(status)) — marking rejected")
      dbHelper.markRejected(id: event.id)
      return .rejected
    }

    NSLog("SupabaseService: server returned HTTP \(status) for event \(event.id) — stays queued for retry")
    return .retryable
  }

  private enum BuildError: Error {
    case secretUnavailable
    case serializationFailed
  }

  /// Builds the canonical JSON payload and signs it with HMAC.
  private func buildRequestBody(event: LocationEventRecord, deviceToken: String) -> Result<Data, BuildError> {
    var payload: [String: Any] = [
      "id": event.id,
      "created_at": formatter.string(from: event.createdAt),
      "company_id": event.companyId,
      "worker_id": event.workerId,
      "assignment_id": event.assignmentId,
      "type": event.type,
      "latitude": event.latitude,
      "longitude": event.longitude,
    ]
    if let notes = event.notes {
      payload["notes"] = notes
    }

    guard let payloadData = try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]),
          let payloadString = String(data: payloadData, encoding: .utf8) else {
      NSLog("SupabaseService: failed to serialize payload for event \(event.id)")
      return .failure(.serializationFailed)
    }

    let hmac = authenticator.computeHmac(payloadString)
    guard !hmac.isEmpty else {
      return .failure(.secretUnavailable)
    }

    let body: [String: String] = [
      "p_payload": payloadString,
      "p_device_token": deviceToken,
      "p_hmac": hmac,
    ]

    guard let bodyData = try? JSONSerialization.data(withJSONObject: body, options: []) else {
      return .failure(.serializationFailed)
    }

    return .success(bodyData)
  }
}
