import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

interface BackgroundLocationModule {
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

let BackgroundLocationModule: BackgroundLocationModule;

try {
  // Only attempt to require the native module if we are on a platform where it's expected to exist.
  // For now, it's implemented on Android. On iOS/Expo Go, we'll fall back to the mock.
  BackgroundLocationModule = requireNativeModule<BackgroundLocationModule>('BackgroundLocation');
} catch (error) {
  console.warn('Native BackgroundLocation module not found, using mock implementation. This is expected in Expo Go or on iOS for now.');
  
  // Mock implementation for development/iOS without native code
  BackgroundLocationModule = {
    start: async (...args) => {
      console.log('[MOCK] BackgroundLocation.start called with:', args);
      return Promise.resolve();
    },
    stop: async () => {
      console.log('[MOCK] BackgroundLocation.stop called');
      return Promise.resolve();
    },
  };
}

export default BackgroundLocationModule;
