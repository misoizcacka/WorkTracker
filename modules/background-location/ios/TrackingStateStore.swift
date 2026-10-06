import Foundation
import CoreLocation

final class TrackingStateStore {
  static let shared = TrackingStateStore()

  // ─── App Group identifier ──────────────────────────────────────────────────
  // This MUST match the App Group you add in Xcode → Signing & Capabilities:
  //   "group.app.koord.tracking"
  // Using an App Group UserDefaults suite means the state is accessible from
  // both the main app process AND the CLLocationManager delegate running in a
  // relaunched background process after a process kill.
  //
  // If the App Group is not yet configured (simulator or unsigned build), we
  // gracefully fall back to standard UserDefaults so the app still runs.
  private static let appGroupSuite = "group.app.koord.tracking"

  private let defaults: UserDefaults
  private let decoder = JSONDecoder()
  private let encoder = JSONEncoder()

  private enum Keys {
    static let workerId          = "bg.workerId"
    static let assignmentId      = "bg.assignmentId"
    static let companyId         = "bg.companyId"
    static let supabaseConfig    = "bg.supabaseConfig"
    static let geofenceAssignments = "bg.geofenceAssignments"
    static let lastInsideStates  = "bg.lastInsideStates"
    static let lastLatitude      = "bg.lastLatitude"
    static let lastLongitude     = "bg.lastLongitude"
    static let lastLocationEventAt = "bg.lastLocationEventAt"
    /// Written every time a location update fires while the process is alive.
    /// On relaunch, if this is far in the past we know tracking was interrupted.
    static let lastProcessHeartbeatAt = "bg.lastProcessHeartbeatAt"
  }

  private init() {
    if let suite = UserDefaults(suiteName: TrackingStateStore.appGroupSuite) {
      defaults = suite
      NSLog("TrackingStateStore: using App Group UserDefaults (\(TrackingStateStore.appGroupSuite))")
    } else {
      defaults = UserDefaults.standard
      NSLog("TrackingStateStore: App Group not available — falling back to standard UserDefaults. State may not survive process kill.")
    }
  }

  // ─── Session identity ──────────────────────────────────────────────────────

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

  // ─── Supabase config ───────────────────────────────────────────────────────

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

  // ─── Geofence assignments ─────────────────────────────────────────────────

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

  // ─── Inside-state tracking ────────────────────────────────────────────────

  var lastInsideStates: [String: Bool] {
    get { defaults.dictionary(forKey: Keys.lastInsideStates) as? [String: Bool] ?? [:] }
    set { defaults.set(newValue, forKey: Keys.lastInsideStates) }
  }

  func updateInsideState(for assignmentId: String, isInside: Bool) {
    var states = lastInsideStates
    states[assignmentId] = isInside
    lastInsideStates = states
  }

  func insideState(for assignmentId: String) -> Bool? {
    lastInsideStates[assignmentId]
  }

  // ─── Last known location ──────────────────────────────────────────────────

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

  // ─── Last event time ──────────────────────────────────────────────────────

  var lastLocationEventAt: Date? {
    get { defaults.object(forKey: Keys.lastLocationEventAt) as? Date }
    set { defaults.set(newValue, forKey: Keys.lastLocationEventAt) }
  }

  // ─── Process heartbeat ────────────────────────────────────────────────────
  // Written on every location update tick while the process is alive.
  // On relaunch after a force-swipe, if this timestamp is old we can surface
  // a "tracking was paused" warning to the worker.

  var lastProcessHeartbeatAt: Date? {
    get { defaults.object(forKey: Keys.lastProcessHeartbeatAt) as? Date }
    set { defaults.set(newValue, forKey: Keys.lastProcessHeartbeatAt) }
  }

  /// Seconds since the last process heartbeat, or -1 if never recorded.
  /// Values > 600 (10 min) reliably indicate a tracking gap on iOS.
  var trackingGapSeconds: Int {
    guard let last = lastProcessHeartbeatAt else { return -1 }
    return Int(-last.timeIntervalSinceNow)
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

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
      Keys.lastLocationEventAt,
      Keys.lastProcessHeartbeatAt,
    ].forEach(defaults.removeObject(forKey:))
  }
}
