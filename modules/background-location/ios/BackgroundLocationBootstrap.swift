import Foundation
import UIKit

public final class BackgroundLocationBootstrap: NSObject {
  @objc
  public static func resumeIfNeeded() {
    IOSBackgroundLocationManager.shared.resumeFromStoredState()
  }

  @objc
  public static func handleLaunchOptions(_ launchOptions: [UIApplication.LaunchOptionsKey: Any]?) {
    guard launchOptions?[.location] != nil else { return }
    IOSBackgroundLocationManager.shared.resumeFromStoredState()
  }
}
