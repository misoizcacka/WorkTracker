import Foundation
import UIKit

/// Called by BackgroundLocationAppDelegateSubscriber at app launch.
/// Registers the BGTaskScheduler handler and resumes location tracking
/// if a session was active when the process was killed.
public final class BackgroundLocationBootstrap: NSObject {

  @objc
  public static func resumeIfNeeded() {
    // Register the BGAppRefreshTask handler BEFORE the app finishes launching.
    // BGTaskScheduler requires registration before any background task can fire.
    IOSBackgroundLocationManager.shared.registerBGTaskScheduler()
    IOSBackgroundLocationManager.shared.resumeFromStoredState()
  }

  @objc
  public static func handleLaunchOptions(_ launchOptions: [UIApplication.LaunchOptionsKey: Any]?) {
    // Register first, then resume.
    IOSBackgroundLocationManager.shared.registerBGTaskScheduler()

    // UIApplication.LaunchOptionsKey.location means iOS relaunched us specifically
    // because a significant location change or geofence transition fired while
    // the app was not running — resume immediately.
    if launchOptions?[.location] != nil {
      IOSBackgroundLocationManager.shared.resumeFromStoredState()
    } else {
      // Normal launch — still resume if a session was persisted (e.g. app was
      // force-quit by the user but a work session is still technically open).
      IOSBackgroundLocationManager.shared.resumeFromStoredState()
    }
  }
}
