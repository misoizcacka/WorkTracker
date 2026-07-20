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
  flushPendingEvents: (supabaseUrl?: string, supabaseKey?: string) => Promise<number>;
  requestWhenInUseAuthorization: () => Promise<void>;
  requestAlwaysAuthorization: () => Promise<void>;
  getAuthorizationStatus: () => Promise<string>;
  getDiagnostics: () => Promise<LocationDiagnostics>;
}

export interface LocationDiagnostics {
  serviceRunning: boolean;
  workManagerState: string;         // RUNNING | ENQUEUED | SUCCEEDED | NOT_SCHEDULED | etc.
  trackingMode: string;             // ACTIVE | PASSIVE
  geofenceCount: number;
  lastLatitude: number;
  lastLongitude: number;
  lastLocationAgeSeconds: number;   // -1 if never
  lastLocationAccuracyMeters: number; // -1 if unknown
  hasActiveSession: boolean;
  workerId: string;
  assignmentId: string;
  unsyncedNativeEventCount: number;
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
    flushPendingEvents: async (supabaseUrl?: string, supabaseKey?: string) => {
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
    getDiagnostics: async () => {
      console.log('[MOCK] BackgroundLocation.getDiagnostics called');
      return {
        serviceRunning: false,
        workManagerState: 'NOT_SCHEDULED',
        trackingMode: 'ACTIVE',
        geofenceCount: 0,
        lastLatitude: 0,
        lastLongitude: 0,
        lastLocationAgeSeconds: -1,
        lastLocationAccuracyMeters: -1,
        hasActiveSession: false,
        workerId: '',
        assignmentId: '',
        unsyncedNativeEventCount: 0,
      };
    },
  };
}

export default BackgroundLocationModule;
