import Foundation
import CoreLocation

final class TrackingStateStore {
  static let shared = TrackingStateStore()

  private let defaults = UserDefaults.standard
  private let decoder = JSONDecoder()
  private let encoder = JSONEncoder()

  private enum Keys {
    static let workerId = "bg.workerId"
    static let assignmentId = "bg.assignmentId"
    static let companyId = "bg.companyId"
    static let supabaseConfig = "bg.supabaseConfig"
    static let geofenceAssignments = "bg.geofenceAssignments"
    static let lastInsideStates = "bg.lastInsideStates"
    static let lastLatitude = "bg.lastLatitude"
    static let lastLongitude = "bg.lastLongitude"
    static let lastLocationEventAt = "bg.lastLocationEventAt"
  }

  private init() {}

  var workerId: String? {
    get { defaults.string(forKey: Keys.workerId) }
    set { defaults.set(newValue, forKey: Keys.workerId) }
  }

  var assignmentId: String? {
    get { defaults.string(forKey: Keys.assignmentId) }
    set { defaults.set(newValue, forKey: Keys.assignmentId) }
  }

  var companyId: String? {
    get { defaults.string(forKey: Keys.companyId) }
    set { defaults.set(newValue, forKey: Keys.companyId) }
  }

  var supabaseConfig: SupabaseConfig? {
    get {
      guard let data = defaults.data(forKey: Keys.supabaseConfig) else { return nil }
      return try? decoder.decode(SupabaseConfig.self, from: data)
    }
    set {
      if let newValue, let data = try? encoder.encode(newValue) {
        defaults.set(data, forKey: Keys.supabaseConfig)
      } else {
        defaults.removeObject(forKey: Keys.supabaseConfig)
      }
    }
  }

  var geofenceAssignments: [GeofenceAssignment] {
    get {
      guard let data = defaults.data(forKey: Keys.geofenceAssignments),
            let assignments = try? decoder.decode([GeofenceAssignment].self, from: data) else {
        return []
      }
      return assignments
    }
    set {
      if let data = try? encoder.encode(newValue) {
        defaults.set(data, forKey: Keys.geofenceAssignments)
      } else {
        defaults.removeObject(forKey: Keys.geofenceAssignments)
      }
    }
  }

  var lastInsideStates: [String: Bool] {
    get { defaults.dictionary(forKey: Keys.lastInsideStates) as? [String: Bool] ?? [:] }
    set { defaults.set(newValue, forKey: Keys.lastInsideStates) }
  }

  var lastKnownLocation: CLLocationCoordinate2D? {
    get {
      guard defaults.object(forKey: Keys.lastLatitude) != nil,
            defaults.object(forKey: Keys.lastLongitude) != nil else {
        return nil
      }
      return CLLocationCoordinate2D(
        latitude: defaults.double(forKey: Keys.lastLatitude),
        longitude: defaults.double(forKey: Keys.lastLongitude)
      )
    }
    set {
      if let newValue {
        defaults.set(newValue.latitude, forKey: Keys.lastLatitude)
        defaults.set(newValue.longitude, forKey: Keys.lastLongitude)
      } else {
        defaults.removeObject(forKey: Keys.lastLatitude)
        defaults.removeObject(forKey: Keys.lastLongitude)
      }
    }
  }

  var lastLocationEventAt: Date? {
    get { defaults.object(forKey: Keys.lastLocationEventAt) as? Date }
    set { defaults.set(newValue, forKey: Keys.lastLocationEventAt) }
  }

  func updateInsideState(for assignmentId: String, isInside: Bool) {
    var states = lastInsideStates
    states[assignmentId] = isInside
    lastInsideStates = states
  }

  func insideState(for assignmentId: String) -> Bool? {
    lastInsideStates[assignmentId]
  }

  func clear() {
    [
      Keys.workerId,
      Keys.assignmentId,
      Keys.companyId,
      Keys.supabaseConfig,
      Keys.geofenceAssignments,
      Keys.lastInsideStates,
      Keys.lastLatitude,
      Keys.lastLongitude,
      Keys.lastLocationEventAt
    ].forEach(defaults.removeObject(forKey:))
  }
}
