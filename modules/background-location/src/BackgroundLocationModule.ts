import { NativeModule, requireNativeModule } from 'expo';

declare class BackgroundLocationModule extends NativeModule {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<BackgroundLocationModule>('BackgroundLocation');
