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

  func sendEvent(_ event: LocationEventRecord) async -> Bool {
    guard dbHelper.insertLocationEvent(event) else {
      NSLog("SupabaseService: skipping \(event.type) for assignment \(event.assignmentId) because local insert was rejected")
      return false
    }

    guard let deviceToken = authenticator.deviceToken else {
      return false
    }

    let payload: [String: Any?] = [
      "id": event.id,
      "created_at": formatter.string(from: event.createdAt),
      "company_id": event.companyId,
      "worker_id": event.workerId,
      "assignment_id": event.assignmentId,
      "type": event.type,
      "latitude": event.latitude,
      "longitude": event.longitude,
      "notes": event.notes
    ]

    guard let payloadData = try? JSONSerialization.data(withJSONObject: payload.compactMapValues { $0 }, options: []),
          let payloadString = String(data: payloadData, encoding: .utf8) else {
      return false
    }

    let hmac = authenticator.computeHmac(payloadString)
    guard !hmac.isEmpty,
          let requestURL = URL(string: config.url + "/rest/v1/rpc/insert_location_event") else {
      return false
    }

    let body: [String: String] = [
      "p_payload": payloadString,
      "p_device_token": deviceToken,
      "p_hmac": hmac
    ]

    guard let bodyData = try? JSONSerialization.data(withJSONObject: body, options: []) else {
      return false
    }

    var request = URLRequest(url: requestURL)
    request.httpMethod = "POST"
    request.setValue(config.key, forHTTPHeaderField: "apikey")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = bodyData

    do {
      let (_, response) = try await session.data(for: request)
      guard let httpResponse = response as? HTTPURLResponse,
            200..<300 ~= httpResponse.statusCode else {
        return false
      }
      dbHelper.markSynced(id: event.id)
      return true
    } catch {
      NSLog("SupabaseService: request failed for \(event.id): \(error.localizedDescription)")
      return false
    }
  }
}
