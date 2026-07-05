import ExpoModulesCore
import UIKit

public class BackgroundLocationAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    BackgroundLocationBootstrap.handleLaunchOptions(launchOptions)
    return false
  }
}
