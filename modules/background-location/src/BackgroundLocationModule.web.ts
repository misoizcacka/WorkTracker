import { registerWebModule, NativeModule } from 'expo';

class BackgroundLocationModule extends NativeModule {
  start(
    workerId: string,
    assignmentId: string,
    companyId: string,
    supabaseConfig: string,
    deviceToken: string,
    deviceSecret: string,
    geofenceAssignments: string
  ): Promise<void> {
    console.warn("BackgroundLocation.start() is not available on web. Arguments received but will do nothing.", { workerId, assignmentId, companyId, supabaseConfig, deviceToken, deviceSecret, geofenceAssignments });
    return Promise.resolve();
  }
  stop(): Promise<void> {
    console.warn("BackgroundLocation.stop() is not available on web. It will do nothing.");
    return Promise.resolve();
  }
};

export default registerWebModule(BackgroundLocationModule, 'BackgroundLocation');
