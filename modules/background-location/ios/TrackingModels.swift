import Foundation

/// Tracking modes for the location service.
/// 
/// PASSIVE: Worker confirmed inside geofence - balanced power, 5-min updates
/// EXIT_PENDING: Possible exit detected - HIGH ACCURACY GPS, 30-sec updates to confirm
/// ACTIVE: Worker confirmed outside geofence - high accuracy, 1-min updates
enum TrackingMode: String, Codable {
    case passive = "PASSIVE"
    case exitPending = "EXIT_PENDING"
    case active = "ACTIVE"
}

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
