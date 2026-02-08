import ExpoModulesCore

public class BackgroundLocationModule: Module {
  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  public func definition() -> ModuleDefinition {

    Name("BackgroundLocation")

    Function("start") {
      return "BackgroundLocation.start invoked"
    }

    Function("stop") {
      return "BackgroundLocation.stop invoked"
    }

  //   View(BackgroundLocationView.self) {
  //     // Defines a setter for the `url` prop.
  //     Prop("url") { (view: BackgroundLocationView, url: URL) in
  //       if view.webView.url != url {
  //         view.webView.load(URLRequest(url: url))
  //       }
  //     }

  //     Events("onLoad")
  //   }
  // }
}
