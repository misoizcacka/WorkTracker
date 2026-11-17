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

// === File Logging Functions ===

export interface LogStats {
  current_size_bytes: number;
  old_size_bytes: number;
  total_size_bytes: number;
  current_size_mb: string;
  total_size_mb: string;
  line_count: number;
  max_size_mb: string;
}

/**
 * Export all logs as a string (current + old rotated logs)
 */
export function exportLogs(): Promise<string> {
    return BackgroundLocationModule.exportLogs?.() ?? Promise.resolve('');
}

/**
 * Get recent logs (last N lines, default 100)
 */
export function getRecentLogs(lines: number = 100): Promise<string> {
    return BackgroundLocationModule.getRecentLogs?.(lines) ?? Promise.resolve('');
}

/**
 * Clear all logs
 */
export function clearLogs(): Promise<void> {
    return BackgroundLocationModule.clearLogs?.() ?? Promise.resolve();
}

/**
 * Get log file statistics
 */
export function getLogStats(): Promise<LogStats> {
    return BackgroundLocationModule.getLogStats?.() ?? Promise.resolve({
        current_size_bytes: 0,
        old_size_bytes: 0,
        total_size_bytes: 0,
        current_size_mb: '0',
        total_size_mb: '0',
        line_count: 0,
        max_size_mb: '0'
    });
}

// === Battery Optimization Functions ===

/**
 * Check if battery optimization is disabled for this app
 * Returns true if disabled (good for tracking) or if device doesn't support battery optimization
 */
export function isBatteryOptimizationDisabled(): boolean {
    return BackgroundLocationModule.isBatteryOptimizationDisabled?.() ?? true;
}

/**
 * Get device manufacturer (e.g., 'samsung', 'xiaomi', 'Google')
 */
export function getDeviceManufacturer(): string {
    return BackgroundLocationModule.getDeviceManufacturer?.() ?? 'unknown';
}

/**
 * Open battery optimization settings for this app
 * Returns true if settings were opened, false if not supported
 */
export function openBatteryOptimizationSettings(): Promise<boolean> {
    return BackgroundLocationModule.openBatteryOptimizationSettings?.() ?? Promise.resolve(false);
}
