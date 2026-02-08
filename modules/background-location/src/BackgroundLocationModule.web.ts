import { registerWebModule, NativeModule } from 'expo';

class BackgroundLocationModule extends NativeModule {
  start(): Promise<void> {
    console.warn("BackgroundLocation.start() is not available on web. It will do nothing.");
    return Promise.resolve();
  }
  stop(): Promise<void> {
    console.warn("BackgroundLocation.stop() is not available on web. It will do nothing.");
    return Promise.resolve();
  }
};

export default registerWebModule(BackgroundLocationModule, 'BackgroundLocation');
