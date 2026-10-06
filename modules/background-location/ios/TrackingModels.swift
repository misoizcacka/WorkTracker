import Foundation

struct GeofenceAssignment: Codable {
  let id: String
  let latitude: Double
  let longitude: Double
  let radius: Double
  let type: String
  let status: String
}

struct SupabaseConfig: Codable {
  let url: String
  let key: String
  /// Human-readable location name shown in the notification, e.g. "Working at Main Office".
  /// Mirrors Android's KEY_LOCATION_NAME SharedPreferences entry.
  let locationName: String?
  /// Access token — reserved for future authenticated endpoints.
  let accessToken: String?
}

struct LocationEventRecord {
  let id: String
  let createdAt: Date
  let companyId: String
  let workerId: String
  let assignmentId: String
  let type: String
  let latitude: Double
  let longitude: Double
  let notes: String?
}
