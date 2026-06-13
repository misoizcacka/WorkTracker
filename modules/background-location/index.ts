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
  geofenceAssignments: string,
  locationName: string = ''
): Promise<void> {
    // Embed locationName into supabaseConfig to avoid exceeding Expo Modules AsyncFunction param limit (8)
    const supabaseConfigWithName = JSON.stringify({ ...JSON.parse(supabaseConfig), locationName });

    try {
        return BackgroundLocationModule.start(
          workerId,
          assignmentId,
          companyId,
          supabaseConfigWithName,
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
