import ExpoModulesCore

public class BackgroundLocationModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackgroundLocation")

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

      let parsedSupabaseConfig = try decoder.decode(SupabaseConfig.self, from: supabaseConfigData)
      let parsedAssignments = try decoder.decode([GeofenceAssignment].self, from: assignmentsData)

      try IOSBackgroundLocationManager.shared.start(
        workerId: workerId,
        assignmentId: assignmentId,
        companyId: companyId,
        supabaseConfig: parsedSupabaseConfig,
        deviceToken: deviceToken,
        deviceSecret: deviceSecret,
        geofenceAssignments: parsedAssignments
      )
    }

    AsyncFunction("stop") {
      IOSBackgroundLocationManager.shared.stop()
    }
  }
}
