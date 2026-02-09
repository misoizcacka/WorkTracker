import { NativeModule, requireNativeModule } from 'expo';

declare class BackgroundLocationModule extends NativeModule {
  start: (
    workerId: string,
    assignmentId: string,
    companyId: string,
    supabaseUrl: string,
    supabasePublishableKey: string,
    accessToken: string
  ) => Promise<void>;
  stop: () => Promise<void>;
}

export default requireNativeModule<BackgroundLocationModule>('BackgroundLocation');
