import Foundation
import CoreLocation
import UIKit

final class IOSBackgroundLocationManager: NSObject, CLLocationManagerDelegate {
  static let shared = IOSBackgroundLocationManager()

  private let locationManager = CLLocationManager()
  private let stateStore = TrackingStateStore.shared
  private let authenticator = DeviceAuthenticator()
  private let activeInterval: TimeInterval = 5 * 60
  private let passiveInterval: TimeInterval = 15 * 60
  private var currentModeIsActive: Bool?
  private var shouldTreatNextLocationAsReconcile = false

  private override init() {
    super.init()
    locationManager.delegate = self
    locationManager.allowsBackgroundLocationUpdates = true
    locationManager.pausesLocationUpdatesAutomatically = false

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
      throw NSError(domain: "BackgroundLocation", code: 1, userInfo: [NSLocalizedDescriptionKey: "Background location permission must be set to Always Allow."])
    }

    stateStore.workerId = workerId
    stateStore.assignmentId = assignmentId
    stateStore.companyId = companyId
    stateStore.supabaseConfig = supabaseConfig
    stateStore.geofenceAssignments = geofenceAssignments
    authenticator.storeCredentials(token: deviceToken, secret: deviceSecret)

    registerGeofences(assignments: geofenceAssignments)
    let isInsideCurrent = currentAssignment().flatMap { stateStore.insideState(for: $0.id) } ?? true
    startLocationUpdates(active: !isInsideCurrent)
    locationManager.startMonitoringSignificantLocationChanges()
    shouldTreatNextLocationAsReconcile = true
    locationManager.requestLocation()
  }

  func stop() {
    locationManager.stopUpdatingLocation()
    locationManager.stopMonitoringSignificantLocationChanges()
    for region in locationManager.monitoredRegions {
      locationManager.stopMonitoring(for: region)
    }
    currentModeIsActive = nil
    stateStore.clear()
    authenticator.clearCredentials()
  }

  @objc
  private func handleAppBecameActive() {
    reconcileCurrentState()
  }

  private func registerGeofences(assignments: [GeofenceAssignment]) {
    for region in locationManager.monitoredRegions {
      locationManager.stopMonitoring(for: region)
    }

    for assignment in assignments.prefix(20) where assignment.status == "active" || assignment.status == "next" {
      let region = CLCircularRegion(
        center: CLLocationCoordinate2D(latitude: assignment.latitude, longitude: assignment.longitude),
        radius: assignment.radius,
        identifier: assignment.id
      )
      region.notifyOnEntry = true
      region.notifyOnExit = true
      locationManager.startMonitoring(for: region)
    }
  }

  private func currentAssignment() -> GeofenceAssignment? {
    guard let assignmentId = stateStore.assignmentId else { return nil }
    return stateStore.geofenceAssignments.first(where: { $0.id == assignmentId })
  }

  private func startLocationUpdates(active: Bool) {
    if currentModeIsActive == active {
      return
    }
    currentModeIsActive = active
    locationManager.stopUpdatingLocation()
    locationManager.desiredAccuracy = active ? kCLLocationAccuracyNearestTenMeters : kCLLocationAccuracyHundredMeters
    locationManager.distanceFilter = active ? 25 : 250
    locationManager.startUpdatingLocation()
  }

  private func reconcileCurrentState() {
    guard CLLocationManager.locationServicesEnabled() else { return }
    shouldTreatNextLocationAsReconcile = true
    locationManager.requestLocation()
  }

  private func handleLocation(_ location: CLLocation) {
    stateStore.lastKnownLocation = location.coordinate
    let source = shouldTreatNextLocationAsReconcile ? "reconcile" : "location_update"
    shouldTreatNextLocationAsReconcile = false
    Task {
      await processLocation(location, source: source)
    }
  }

  private func processLocation(_ location: CLLocation, source: String) async {
    guard let workerId = stateStore.workerId,
          let companyId = stateStore.companyId,
          stateStore.supabaseConfig != nil else {
      return
    }

    var transitionDetected = false
    for assignment in stateStore.geofenceAssignments where assignment.status == "active" || assignment.status == "next" {
      let assignmentLocation = CLLocation(latitude: assignment.latitude, longitude: assignment.longitude)
      let isInside = location.distance(from: assignmentLocation) <= assignment.radius
      let previousInside = stateStore.insideState(for: assignment.id)

      if previousInside == nil || previousInside != isInside {
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
          notes: source == "reconcile" ? "Reconciled on app resume" : "Transition detected via \(source)"
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
      notes: "Periodic update (\(trackingType))"
    )
    stateStore.lastLocationEventAt = Date()
  }

  private func emitEvent(
    type: String,
    assignmentId: String,
    workerId: String,
    companyId: String,
    latitude: Double,
    longitude: Double,
    notes: String?
  ) async {
    guard let config = stateStore.supabaseConfig else { return }
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

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else { return }
    handleLocation(location)
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    NSLog("IOSBackgroundLocationManager: location update failed: \(error.localizedDescription)")
  }

  func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
    if let location = manager.location {
      Task {
        await processLocation(location, source: "os_geofence_enter")
      }
    } else {
      shouldTreatNextLocationAsReconcile = true
      manager.requestLocation()
    }
  }

  func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
    if let location = manager.location {
      Task {
        await processLocation(location, source: "os_geofence_exit")
      }
    } else {
      shouldTreatNextLocationAsReconcile = true
      manager.requestLocation()
    }
  }
}
