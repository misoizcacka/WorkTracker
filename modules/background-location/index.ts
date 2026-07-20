import BackgroundLocationModule from './src/BackgroundLocationModule';
import type { LocationDiagnostics } from './src/BackgroundLocationModule';
export type { LocationDiagnostics };

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
  locationName: string = '',
  accessToken: string = ''
): Promise<void> {
    const config = { ...JSON.parse(supabaseConfig), locationName, accessToken };

    try {
        return BackgroundLocationModule.start(
          workerId,
          assignmentId,
          companyId,
          JSON.stringify(config),
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

export function flushPendingEvents(supabaseUrl?: string, supabaseKey?: string): Promise<number> {
    return BackgroundLocationModule.flushPendingEvents?.(supabaseUrl, supabaseKey) ?? Promise.resolve(0);
}

export function requestWhenInUseAuthorization(): Promise<void> {
    return BackgroundLocationModule.requestWhenInUseAuthorization();
}

export function requestAlwaysAuthorization(): Promise<void> {
    return BackgroundLocationModule.requestAlwaysAuthorization();
}

export function getAuthorizationStatus(): Promise<string> {
    return BackgroundLocationModule.getAuthorizationStatus();
}

export function getDiagnostics(): Promise<LocationDiagnostics> {
    return BackgroundLocationModule.getDiagnostics();
}
