import Foundation

final class SupabaseService {
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
    return await sendPersistedEvent(event)
  }

  /// Flush all unsynced events from the local DB.
  /// Mirrors Android SupabaseService.flushPendingEvents():
  ///   - Events the server permanently rejects (4xx) are marked synced to unblock the queue.
  ///   - Network-level errors abort the loop early so we don't hammer a down server.
  /// Returns the number of events successfully pushed.
  @discardableResult
  func flushPendingEvents(limit: Int = 25) async -> Int {
    guard isOnline() else { return 0 }

    var totalFlushed = 0
    var consecutiveNetworkFailures = 0

    while true {
      let pending = dbHelper.unsyncedEvents(limit: limit)
      guard !pending.isEmpty else { break }

      NSLog("SupabaseService: flushPendingEvents — flushing batch of \(pending.count)")

      var batchNetworkErrors = 0

      for event in pending {
        do {
          let success = try await sendPersistedEventThrowing(event)
          if success {
            totalFlushed += 1
          } else {
            // Server rejected with a non-network error (4xx) — mark synced to unblock the queue.
            // Likely a stale event with bad HMAC / wrong timestamp.
            NSLog("SupabaseService: event \(event.id) permanently rejected — marking synced to unblock queue")
            dbHelper.markSynced(id: event.id)
          }
        } catch {
          // URLSession threw — genuine network error, don't skip the event.
          batchNetworkErrors += 1
          NSLog("SupabaseService: network error pushing event \(event.id): \(error.localizedDescription)")
        }
      }

      consecutiveNetworkFailures = batchNetworkErrors > 0 ? consecutiveNetworkFailures + 1 : 0
      if consecutiveNetworkFailures >= 2 {
        NSLog("SupabaseService: aborting flush after repeated network errors")
        break
      }
    }

    NSLog("SupabaseService: flushPendingEvents — total flushed \(totalFlushed)")
    return totalFlushed
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /// Attempt to push a single persisted event.
  /// Returns true on HTTP 2xx, false on HTTP 4xx/5xx (server-rejected), throws on network error.
  private func sendPersistedEventThrowing(_ event: LocationEventRecord) async throws -> Bool {
    guard let deviceToken = authenticator.deviceToken else {
      NSLog("SupabaseService: no device token — cannot push event \(event.id)")
      return false
    }

    guard let (bodyData, _) = buildRequestBody(event: event, deviceToken: deviceToken) else {
      return false
    }

    guard let requestURL = URL(string: config.url + "/rest/v1/rpc/insert_location_event") else {
      return false
    }

    var request = URLRequest(url: requestURL)
    request.httpMethod = "POST"
    request.setValue(config.key, forHTTPHeaderField: "apikey")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = bodyData
    request.timeoutInterval = 15

    // Throws on network error (no connectivity, timeout, DNS failure, etc.)
    let (_, response) = try await session.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse else { return false }

    if (200..<300).contains(httpResponse.statusCode) {
      dbHelper.markSynced(id: event.id)
      return true
    }

    NSLog("SupabaseService: server returned \(httpResponse.statusCode) for event \(event.id)")
    return false
  }

  /// Non-throwing version used by sendEvent (called for individual events, not batch flush).
  private func sendPersistedEvent(_ event: LocationEventRecord) async -> Bool {
    do {
      return try await sendPersistedEventThrowing(event)
    } catch {
      NSLog("SupabaseService: network error for event \(event.id): \(error.localizedDescription)")
      return false
    }
  }

  /// Builds the canonical JSON payload and signs it with HMAC.
  /// Returns (bodyData, payloadString) on success, nil on failure.
  private func buildRequestBody(event: LocationEventRecord, deviceToken: String) -> (Data, String)? {
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
      return nil
    }

    let hmac = authenticator.computeHmac(payloadString)
    guard !hmac.isEmpty else {
      NSLog("SupabaseService: HMAC computation failed for event \(event.id)")
      return nil
    }

    let body: [String: String] = [
      "p_payload": payloadString,
      "p_device_token": deviceToken,
      "p_hmac": hmac,
    ]

    guard let bodyData = try? JSONSerialization.data(withJSONObject: body, options: []) else {
      return nil
    }

    return (bodyData, payloadString)
  }

  private func isOnline() -> Bool {
    // Simple reachability check — a URLSession data task will also fail fast when offline.
    // For a more robust check we'd import Network framework, but that adds complexity.
    // The flush loop handles network errors gracefully anyway.
    return true
  }
}
