import ExpoModulesCore

public class BackgroundLocationModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackgroundLocation")

    // ─── start ──────────────────────────────────────────────────────────────
    AsyncFunction("start") { (
      workerId: String,
      assignmentId: String,
      companyId: String,
      supabaseConfig: String,
      deviceToken: String,
      deviceSecret: String,
      geofenceAssignments: String
    ) in
      let decoder = JSONDecoder()
      guard let supabaseConfigData = supabaseConfig.data(using: .utf8),
            let assignmentsData = geofenceAssignments.data(using: .utf8) else {
        throw NSError(domain: "BackgroundLocation", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid input payload."])
      }

      let parsedConfig      = try decoder.decode(SupabaseConfig.self, from: supabaseConfigData)
      let parsedAssignments = try decoder.decode([GeofenceAssignment].self, from: assignmentsData)

      try IOSBackgroundLocationManager.shared.start(
        workerId: workerId,
        assignmentId: assignmentId,
        companyId: companyId,
        supabaseConfig: parsedConfig,
        deviceToken: deviceToken,
        deviceSecret: deviceSecret,
        geofenceAssignments: parsedAssignments
      )
    }

    // ─── stop ────────────────────────────────────────────────────────────────
    AsyncFunction("stop") {
      IOSBackgroundLocationManager.shared.stop()
    }

    // ─── getDiagnostics ──────────────────────────────────────────────────────
    // Returns a map matching Android's getDiagnostics() shape exactly, so the
    // JS diagnostics screen works on both platforms without platform branching.
    AsyncFunction("getDiagnostics") { () -> [String: Any] in
      return IOSBackgroundLocationManager.shared.getDiagnostics()
    }

    // ─── flushPendingEvents ──────────────────────────────────────────────────
    // Manually flush the native SQLite event queue to Supabase.
    // Called from JS when the app comes to the foreground (same as Android).
    // supabaseUrl / supabaseKey are optional — stored config is preferred.
    AsyncFunction("flushPendingEvents") { (supabaseUrl: String?, supabaseKey: String?) -> Int in
      return await IOSBackgroundLocationManager.shared.flushPendingEventsFromJS(
        supabaseUrl: supabaseUrl,
        supabaseKey: supabaseKey
      )
    }

    // ─── Authorization helpers ───────────────────────────────────────────────
    AsyncFunction("requestWhenInUseAuthorization") {
      IOSBackgroundLocationManager.shared.requestWhenInUseAuthorization()
    }

    AsyncFunction("requestAlwaysAuthorization") {
      IOSBackgroundLocationManager.shared.requestAlwaysAuthorization()
    }

    AsyncFunction("getAuthorizationStatus") {
      IOSBackgroundLocationManager.shared.authorizationStatus()
    }
  }
}
