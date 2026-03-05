import BackgroundLocationModule from './src/BackgroundLocationModule';

export interface GeofenceAssignment {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  type: 'project' | 'common_location';
  status: 'active' | 'next' | 'pending' | 'completed'; // Include all possible statuses from frontend
}

export function start(
  workerId: string,
  assignmentId: string,
  companyId: string,
  supabaseConfig: string,
  deviceToken: string,
  deviceSecret: string,
  geofenceAssignments: string
): Promise<void> {
    console.log("JS BackgroundLocation.start: workerId", workerId);
    console.log("JS BackgroundLocation.start: assignmentId", assignmentId);
    console.log("JS BackgroundLocation.start: companyId", companyId);
    console.log("JS BackgroundLocation.start: supabaseConfig (partial)", supabaseConfig.substring(0, 20) + "...");
    console.log("JS BackgroundLocation.start: deviceToken (partial)", deviceToken.substring(0, 5) + "...");
    console.log("JS BackgroundLocation.start: deviceSecret (partial)", deviceSecret.substring(0, 5) + "...");
    console.log("JS BackgroundLocation.start: geofenceAssignments (length)", geofenceAssignments.length);

    try {
        return BackgroundLocationModule.start(
          workerId,
          assignmentId,
          companyId,
          supabaseConfig,
          deviceToken,
          deviceSecret,
          geofenceAssignments
        );
    } catch (e) {
        console.error("JS BackgroundLocation.start: Error calling native module:", e);
        throw e;
    }
}

export function stop(): Promise<void> {
    return BackgroundLocationModule.stop();
}
