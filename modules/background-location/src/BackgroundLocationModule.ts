import { NativeModule, requireNativeModule } from 'expo';

declare class BackgroundLocationModule extends NativeModule {
  start: (
    workerId: string,
    assignmentId: string,
    companyId: string,
    supabaseConfig: string,
    deviceToken: string,
    deviceSecret: string,
    geofenceAssignments: string
  ) => Promise<void>;
  stop: () => Promise<void>;
}

export default requireNativeModule<BackgroundLocationModule>('BackgroundLocation');
