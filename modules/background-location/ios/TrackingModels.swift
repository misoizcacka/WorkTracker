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
