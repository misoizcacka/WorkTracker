import Foundation
import CoreLocation
import UIKit
import BackgroundTasks

final class IOSBackgroundLocationManager: NSObject, CLLocationManagerDelegate {
  static let shared = IOSBackgroundLocationManager()

  // ─── Liveness flag ────────────────────────────────────────────────────────
  // Mirrors Android's PeriodicLocationTrackingService.isRunning AtomicBoolean.
  // Read by getDiagnostics() to report whether the tracker is currently active.
  private(set) static var isRunning: Bool = false

  // ─── BGTaskScheduler identifier ──────────────────────────────────────────
  // Must be added to Info.plist under "Permitted background task scheduler identifiers":
  //   app.koord.location.refresh
  static let bgTaskIdentifier = "app.koord.location.refresh"

  // ─── Tracking intervals (mirrors Android Constants) ──────────────────────
  // Active = worker travelling outside geofence  → frequent updates
  // Passive = worker on site inside geofence     → infrequent updates
  private let activeInterval: TimeInterval  = 2 * 60   //  2 min
  private let passiveInterval: TimeInterval = 5 * 60   //  5 min

  private let locationManager = CLLocationManager()
  private let stateStore = TrackingStateStore.shared
  private let authenticator = DeviceAuthenticator()

  private var currentModeIsActive: Bool?
  private var shouldTreatNextLocationAsReconcile = false
  private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
  private var notificationId = "koord.work.session"

  private override init() {
    super.init()
    locationManager.delegate = self
    locationManager.allowsBackgroundLocationUpdates = true
    locationManager.pausesLocationUpdatesAutomatically = true
    locationManager.activityType = .other

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleAppBecameActive),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  // ─── Authorization ────────────────────────────────────────────────────────

  func authorizationStatus() -> String {
    switch locationManager.authorizationStatus {
    case .notDetermined:   return "not_determined"
    case .restricted:      return "restricted"
    case .denied:          return "denied"
    case .authorizedAlways: return "authorized_always"
    case .authorizedWhenInUse: return "authorized_when_in_use"
    @unknown default:      return "unknown"
    }
  }

  func requestWhenInUseAuthorization() {
    locationManager.requestWhenInUseAuthorization()
  }

  func requestAlwaysAuthorization() {
    locationManager.requestAlwaysAuthorization()
  }

  // ─── Start / Stop ─────────────────────────────────────────────────────────

  func start(
    workerId: String,
    assignmentId: String,
    companyId: String,
    supabaseConfig: SupabaseConfig,
    deviceToken: String,
    deviceSecret: String,
    geofenceAssignments: [GeofenceAssignment]
  ) throws {
    let authStatus = locationManager.authorizationStatus
    guard authStatus == .authorizedAlways else {
      if authStatus == .notDetermined {
        locationManager.requestAlwaysAuthorization()
      }
      throw NSError(
        domain: "BackgroundLocation",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Background location permission must be set to 'Always Allow'."]
      )
    }

    stateStore.workerId    = workerId
    stateStore.assignmentId = assignmentId
    stateStore.companyId   = companyId
    stateStore.supabaseConfig = supabaseConfig
    stateStore.geofenceAssignments = geofenceAssignments
    authenticator.storeCredentials(token: deviceToken, secret: deviceSecret)

    IOSBackgroundLocationManager.isRunning = true

    registerGeofences(assignments: geofenceAssignments)

    let isInsideCurrent = currentAssignment()
      .flatMap { stateStore.insideState(for: $0.id) } ?? true
    startLocationUpdates(active: !isInsideCurrent)

    locationManager.startMonitoringSignificantLocationChanges()
    shouldTreatNextLocationAsReconcile = true
    locationManager.requestLocation()

    showForegroundNotification(locationName: supabaseConfig.locationName)
    scheduleBackgroundRefresh()

    flushPendingEvents()
  }

  func resumeFromStoredState() {
    guard stateStore.workerId != nil,
          stateStore.assignmentId != nil,
          stateStore.companyId != nil,
          stateStore.supabaseConfig != nil else {
      return
    }

    IOSBackgroundLocationManager.isRunning = true

    registerGeofences(assignments: stateStore.geofenceAssignments)

    let isInsideCurrent = currentAssignment()
      .flatMap { stateStore.insideState(for: $0.id) } ?? true
    startLocationUpdates(active: !isInsideCurrent)

    locationManager.startMonitoringSignificantLocationChanges()
    shouldTreatNextLocationAsReconcile = true
    locationManager.requestLocation()

    scheduleBackgroundRefresh()
    flushPendingEvents()
  }

  func stop() {
    IOSBackgroundLocationManager.isRunning = false
    locationManager.stopUpdatingLocation()
    locationManager.stopMonitoringSignificantLocationChanges()
    for region in locationManager.monitoredRegions {
      locationManager.stopMonitoring(for: region)
    }
    currentModeIsActive = nil
    stateStore.clear()
    authenticator.clearCredentials()
    removeNotification()
    cancelBackgroundRefresh()
    endBackgroundTask()
  }

  // ─── Diagnostics ──────────────────────────────────────────────────────────
  /// Returns a dictionary matching Android's getDiagnostics() map shape so
  /// the JS diagnostics screen works identically on both platforms.
  func getDiagnostics() -> [String: Any] {
    let dbHelper = LocationDbHelper.shared
    let unsyncedCount = dbHelper.unsyncedEventCount()

    let geofenceCount = stateStore.geofenceAssignments
      .filter { $0.status != "completed" }
      .count

    let monitoredRegionCount = locationManager.monitoredRegions.count
    let trackingMode = (currentModeIsActive ?? false) ? "ACTIVE" : "PASSIVE"

    let lastCoord = stateStore.lastKnownLocation
    let lastEventAt = stateStore.lastLocationEventAt
    let lastLocationAgeSeconds: Int
    if let date = lastEventAt {
      lastLocationAgeSeconds = Int(-date.timeIntervalSinceNow)
    } else {
      lastLocationAgeSeconds = -1
    }

    return [
      "serviceRunning":              IOSBackgroundLocationManager.isRunning,
      // We track whether a BGTask was submitted via the isRunning / stateStore state.
      // The BGTaskScheduler async API cannot be called synchronously from getDiagnostics.
      "workManagerState":            (IOSBackgroundLocationManager.isRunning && stateStore.workerId != nil) ? "SCHEDULED" : "NOT_SCHEDULED",
      "trackingMode":                trackingMode,
      "geofenceCount":               geofenceCount,
      "monitoredRegionCount":        monitoredRegionCount,
      "lastLatitude":                lastCoord?.latitude ?? 0.0,
      "lastLongitude":               lastCoord?.longitude ?? 0.0,
      "lastLocationAgeSeconds":      lastLocationAgeSeconds,
      // iOS CLLocationManager doesn't expose last fix accuracy directly
      "lastLocationAccuracyMeters":  -1.0,
      "hasActiveSession":            stateStore.workerId != nil,
      "workerId":                    stateStore.workerId ?? "",
      "assignmentId":                stateStore.assignmentId ?? "",
      "unsyncedNativeEventCount":    unsyncedCount,
      "authorizationStatus":         authorizationStatus(),
      // Seconds since last live location tick — gap > 600s means process was killed/force-swiped
      "trackingGapSeconds":          stateStore.trackingGapSeconds,
    ]
  }

  // ─── Public flush (called from JS) ────────────────────────────────────────
  /// Flush unsynced native events to Supabase. Returns the number pushed.
  func flushPendingEventsFromJS(supabaseUrl: String?, supabaseKey: String?) async -> Int {
    // Prefer stored config (set during start()), fall back to JS-provided URL/key
    let config: SupabaseConfig
    if let stored = stateStore.supabaseConfig {
      config = stored
    } else if let url = supabaseUrl, let key = supabaseKey {
      config = SupabaseConfig(url: url, key: key, locationName: nil, accessToken: nil)
    } else {
      return 0
    }
    let service = SupabaseService(config: config, authenticator: authenticator)
    return await service.flushPendingEvents()
  }

  // ─── App Lifecycle ────────────────────────────────────────────────────────

  @objc
  private func handleAppBecameActive() {
    reconcileCurrentState()
  }

  // ─── Geofence registration ────────────────────────────────────────────────

  private func registerGeofences(assignments: [GeofenceAssignment]) {
    for region in locationManager.monitoredRegions {
      locationManager.stopMonitoring(for: region)
    }
    // iOS caps monitored regions at 20 per app — same as Android's .prefix(20)
    for assignment in assignments.prefix(20) where assignment.status != "completed" {
      let region = CLCircularRegion(
        center: CLLocationCoordinate2D(latitude: assignment.latitude, longitude: assignment.longitude),
        radius: assignment.radius,
        identifier: assignment.id
      )
      region.notifyOnEntry = true
      region.notifyOnExit  = true
      locationManager.startMonitoring(for: region)
    }
  }

  private func currentAssignment() -> GeofenceAssignment? {
    guard let assignmentId = stateStore.assignmentId else { return nil }
    return stateStore.geofenceAssignments.first(where: { $0.id == assignmentId })
  }

  // ─── Location update mode ─────────────────────────────────────────────────

  private func startLocationUpdates(active: Bool) {
    if currentModeIsActive == active { return }
    currentModeIsActive = active
    locationManager.stopUpdatingLocation()
    locationManager.desiredAccuracy      = active ? kCLLocationAccuracyNearestTenMeters : kCLLocationAccuracyHundredMeters
    locationManager.distanceFilter       = active ? 25 : 250
    // Allow OS to pause updates only in passive mode — mirror Android BALANCED_POWER behavior
    locationManager.pausesLocationUpdatesAutomatically = !active
    locationManager.activityType         = active ? .fitness : .other
    locationManager.startUpdatingLocation()
    NSLog("IOSBackgroundLocationManager: location updates mode → \(active ? "ACTIVE" : "PASSIVE")")
  }

  // ─── Location processing ──────────────────────────────────────────────────

  private func reconcileCurrentState() {
    guard CLLocationManager.locationServicesEnabled() else { return }
    shouldTreatNextLocationAsReconcile = true
    locationManager.requestLocation()
  }

  private func handleLocation(_ location: CLLocation) {
    // Reject stale cached fixes older than 2 minutes
    guard abs(location.timestamp.timeIntervalSinceNow) < 120 else { return }
    stateStore.lastKnownLocation = location.coordinate
    // Heartbeat: stamp every live location tick so we can detect gaps after a force swipe.
    stateStore.lastProcessHeartbeatAt = Date()
    let source = shouldTreatNextLocationAsReconcile ? "reconcile" : "location_update"
    shouldTreatNextLocationAsReconcile = false
    performBackgroundWork {
      await self.processLocation(location, source: source)
    }
  }

  private func processLocation(_ location: CLLocation, source: String) async {
    guard let workerId = stateStore.workerId,
          let companyId = stateStore.companyId,
          let config = stateStore.supabaseConfig else { return }

    var transitionDetected = false
    for assignment in stateStore.geofenceAssignments where assignment.status != "completed" {
      let target = CLLocation(latitude: assignment.latitude, longitude: assignment.longitude)
      let isInside = location.distance(from: target) <= assignment.radius
      let previous = stateStore.insideState(for: assignment.id)

      if previous == nil || previous != isInside {
        transitionDetected = true
        stateStore.updateInsideState(for: assignment.id, isInside: isInside)
        let type = isInside ? "enter_geofence" : "exit_geofence"
        await emitEvent(
          type: type,
          assignmentId: assignment.id,
          workerId: workerId,
          companyId: companyId,
          latitude: location.coordinate.latitude,
          longitude: location.coordinate.longitude,
          notes: source == "reconcile" ? "Reconciled on app resume" : "Transition detected via \(source)",
          config: config
        )
        if assignment.id == stateStore.assignmentId {
          startLocationUpdates(active: !isInside)
        }
      }
    }

    if transitionDetected {
      stateStore.lastLocationEventAt = Date()
    }

    guard let currentAssignmentId = stateStore.assignmentId else { return }
    let interval = (currentModeIsActive ?? false) ? activeInterval : passiveInterval
    if let lastSent = stateStore.lastLocationEventAt,
       Date().timeIntervalSince(lastSent) < interval {
      return
    }

    let trackingType = (currentModeIsActive ?? false) ? "active_tracking" : "passive_tracking"
    await emitEvent(
      type: trackingType,
      assignmentId: currentAssignmentId,
      workerId: workerId,
      companyId: companyId,
      latitude: location.coordinate.latitude,
      longitude: location.coordinate.longitude,
      notes: "Periodic update (\(trackingType))",
      config: config
    )
    stateStore.lastLocationEventAt = Date()
  }

  // ─── Geofence delegate transition handler ────────────────────────────────

  private func handleRegionTransition(region: CLRegion, isInside: Bool, source: String) {
    guard let assignment = stateStore.geofenceAssignments
            .first(where: { $0.id == region.identifier && $0.status != "completed" }),
          let workerId = stateStore.workerId,
          let companyId = stateStore.companyId,
          let config = stateStore.supabaseConfig else {
      shouldTreatNextLocationAsReconcile = true
      locationManager.requestLocation()
      return
    }

    stateStore.updateInsideState(for: assignment.id, isInside: isInside)
    stateStore.lastLocationEventAt = Date()
    if assignment.id == stateStore.assignmentId {
      startLocationUpdates(active: !isInside)
    }

    let latitude = locationManager.location?.coordinate.latitude ?? assignment.latitude
    let longitude = locationManager.location?.coordinate.longitude ?? assignment.longitude
    let type = isInside ? "enter_geofence" : "exit_geofence"

    performBackgroundWork {
      await self.emitEvent(
        type: type,
        assignmentId: assignment.id,
        workerId: workerId,
        companyId: companyId,
        latitude: latitude,
        longitude: longitude,
        notes: "Transition detected via \(source)",
        config: config
      )
      let service = SupabaseService(config: config, authenticator: self.authenticator)
      await service.flushPendingEvents()
    }

    shouldTreatNextLocationAsReconcile = true
    locationManager.requestLocation()
  }

  // ─── Event emission ───────────────────────────────────────────────────────

  private func emitEvent(
    type: String,
    assignmentId: String,
    workerId: String,
    companyId: String,
    latitude: Double,
    longitude: Double,
    notes: String?,
    config: SupabaseConfig
  ) async {
    let event = LocationEventRecord(
      id: UUID().uuidString.lowercased(),
      createdAt: Date(),
      companyId: companyId,
      workerId: workerId,
      assignmentId: assignmentId,
      type: type,
      latitude: latitude,
      longitude: longitude,
      notes: notes
    )
    let service = SupabaseService(config: config, authenticator: authenticator)
    _ = await service.sendEvent(event)
  }

  // ─── Flush helpers ────────────────────────────────────────────────────────

  private func flushPendingEvents() {
    performBackgroundWork {
      await self.flushPendingEventsAsync()
    }
  }

  private func flushPendingEventsAsync() async {
    guard let config = stateStore.supabaseConfig else { return }
    let service = SupabaseService(config: config, authenticator: authenticator)
    await service.flushPendingEvents()
  }

  // ─── Background task management ──────────────────────────────────────────

  private func performBackgroundWork(_ work: @escaping () async -> Void) {
    beginBackgroundTask()
    Task {
      await work()
      endBackgroundTask()
    }
  }

  private func beginBackgroundTask() {
    guard backgroundTask == .invalid else { return }
    backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "KoordBackgroundLocation") { [weak self] in
      self?.endBackgroundTask()
    }
  }

  private func endBackgroundTask() {
    guard backgroundTask != .invalid else { return }
    UIApplication.shared.endBackgroundTask(backgroundTask)
    backgroundTask = .invalid
  }

  // ─── BGTaskScheduler (iOS equivalent of Android WorkManager) ─────────────
  // This fires approximately every 15 minutes even when the app is fully suspended.
  // It flushes the pending event queue so nothing is lost if the CLLocationManager
  // delegate is not woken up by the OS.
  //
  // Setup required in Xcode:
  //   1. Add BGTaskScheduler to Signing & Capabilities → Background Modes
  //   2. Add "app.koord.location.refresh" to Info.plist key
  //      "BGTaskSchedulerPermittedIdentifiers" (array of strings)

  func registerBGTaskScheduler() {
    BGTaskScheduler.shared.register(
      forTaskWithIdentifier: IOSBackgroundLocationManager.bgTaskIdentifier,
      using: nil
    ) { task in
      self.handleBackgroundRefreshTask(task as! BGAppRefreshTask)
    }
  }

  private func scheduleBackgroundRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: IOSBackgroundLocationManager.bgTaskIdentifier)
    // Earliest fire time: 14 minutes from now (system may delay further)
    request.earliestBeginDate = Date(timeIntervalSinceNow: 14 * 60)
    do {
      try BGTaskScheduler.shared.submit(request)
      NSLog("IOSBackgroundLocationManager: BGAppRefreshTask scheduled in ~14 min")
    } catch {
      NSLog("IOSBackgroundLocationManager: failed to schedule BGTask: \(error.localizedDescription)")
    }
  }

  private func cancelBackgroundRefresh() {
    BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: IOSBackgroundLocationManager.bgTaskIdentifier)
  }

  private func handleBackgroundRefreshTask(_ task: BGAppRefreshTask) {
    // Reschedule immediately so the chain continues
    scheduleBackgroundRefresh()

    // Guard: nothing to do if there's no active session
    guard stateStore.workerId != nil else {
      task.setTaskCompleted(success: true)
      return
    }

    task.expirationHandler = {
      task.setTaskCompleted(success: false)
    }

    Task {
      // Resume location tracking if it was stopped
      resumeFromStoredState()
      // Flush any queued events
      await flushPendingEventsAsync()
      task.setTaskCompleted(success: true)
    }
  }

  // ─── Foreground notification (mirrors Android showForegroundNotification) ─
  // iOS doesn't have foreground services but we can show a persistent local
  // notification while a work session is active, matching Android's behavior.

  private func showForegroundNotification(locationName: String?) {
    let content = UNMutableNotificationContent()
    let name = locationName?.trimmingCharacters(in: .whitespaces)
    content.title = (name?.isEmpty == false) ? "Working at \(name!)" : "Koord — Work Session Active"
    content.body  = "Location tracking is active."
    content.sound = .none

    // Persistent notification — no trigger means it fires immediately and stays
    let request = UNNotificationRequest(
      identifier: notificationId,
      content: content,
      trigger: nil
    )

    UNUserNotificationCenter.current().add(request) { error in
      if let error {
        NSLog("IOSBackgroundLocationManager: notification error: \(error.localizedDescription)")
      }
    }
  }

  private func removeNotification() {
    UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [notificationId])
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [notificationId])
  }

  // ─── CLLocationManagerDelegate ────────────────────────────────────────────

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else { return }
    handleLocation(location)
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    NSLog("IOSBackgroundLocationManager: location update failed: \(error.localizedDescription)")
  }

  func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
    handleRegionTransition(region: region, isInside: true, source: "os_geofence_enter")
  }

  func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
    handleRegionTransition(region: region, isInside: false, source: "os_geofence_exit")
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if manager.authorizationStatus == .authorizedAlways {
      resumeFromStoredState()
    }
  }

  func locationManager(_ manager: CLLocationManager, monitoringDidFailFor region: CLRegion?, withError error: Error) {
    NSLog("IOSBackgroundLocationManager: monitoring failed for \(region?.identifier ?? "unknown"): \(error.localizedDescription)")
    resumeFromStoredState()
  }
}
