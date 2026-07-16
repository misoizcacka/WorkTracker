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
  flushPendingEvents: () => Promise<number>;
  requestWhenInUseAuthorization: () => Promise<void>;
  requestAlwaysAuthorization: () => Promise<void>;
  getAuthorizationStatus: () => Promise<string>;
}

let BackgroundLocationModule: BackgroundLocationModule;

try {
  BackgroundLocationModule = requireNativeModule<BackgroundLocationModule>('BackgroundLocation');
} catch (error) {
  console.warn('Native BackgroundLocation module not found, using mock implementation. This is expected in Expo Go or web.');
  
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
    flushPendingEvents: async () => {
      console.log('[MOCK] BackgroundLocation.flushPendingEvents called');
      return Promise.resolve(0);
    },
    requestWhenInUseAuthorization: async () => {
      console.log('[MOCK] BackgroundLocation.requestWhenInUseAuthorization called');
      return Promise.resolve();
    },
    requestAlwaysAuthorization: async () => {
      console.log('[MOCK] BackgroundLocation.requestAlwaysAuthorization called');
      return Promise.resolve();
    },
    getAuthorizationStatus: async () => {
      console.log('[MOCK] BackgroundLocation.getAuthorizationStatus called');
      return 'unknown';
    },
  };
}

export default BackgroundLocationModule;
