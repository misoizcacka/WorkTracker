import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import moment from 'moment';
import { Text } from '../../components/Themed';
import { Card } from '../../components/Card';
import AnimatedScreen from '../../components/AnimatedScreen';
import { theme } from '../../theme';
import * as BackgroundLocation from 'background-location';
import type { LocationDiagnostics } from 'background-location';

const POLL_INTERVAL_MS = 5000;

function formatAge(seconds: number): string {
  if (seconds < 0) return 'Never';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ago`;
}

function formatAccuracy(meters: number): string {
  if (meters < 0) return 'Unknown';
  return `±${Math.round(meters)}m`;
}

type StatusType = 'ok' | 'warn' | 'error' | 'neutral';

function StatusDot({ status }: { status: StatusType }) {
  const colors: Record<StatusType, string> = {
    ok: theme.colors.success,
    warn: theme.statusColors.warningText,
    error: theme.colors.danger,
    neutral: theme.colors.disabledText,
  };
  return <View style={[styles.statusDot, { backgroundColor: colors[status] }]} />;
}

interface DiagRow {
  label: string;
  value: string;
  status: StatusType;
  hint?: string;
}

function buildRows(d: LocationDiagnostics, now: number): DiagRow[] {
  return [
    {
      label: 'Foreground Service',
      value: d.serviceRunning ? 'Running ✓' : 'NOT running ✗',
      status: d.serviceRunning ? 'ok' : 'error',
      hint: d.serviceRunning ? undefined : 'Service was killed by OS. WorkManager will restart it within 15 min.',
    },
    {
      label: 'WorkManager',
      value: d.workManagerState,
      status: ['RUNNING', 'ENQUEUED', 'SUCCEEDED'].includes(d.workManagerState) ? 'ok'
        : d.workManagerState === 'NOT_SCHEDULED' ? 'warn'
        : 'error',
      hint: d.workManagerState === 'NOT_SCHEDULED'
        ? 'No active session — worker not checked in.'
        : undefined,
    },
    {
      label: 'Tracking Mode',
      value: d.trackingMode,
      status: d.trackingMode === 'ACTIVE' ? 'warn' : 'ok',
      hint: d.trackingMode === 'ACTIVE'
        ? 'Outside geofence — high accuracy GPS active.'
        : 'Inside geofence — balanced accuracy.',
    },
    {
      label: 'Registered Geofences',
      value: String(d.geofenceCount),
      status: d.geofenceCount > 0 ? 'ok' : d.hasActiveSession ? 'warn' : 'neutral',
      hint: d.geofenceCount === 0 && d.hasActiveSession
        ? 'Session active but no geofences registered — check-in may have failed.'
        : undefined,
    },
    {
      label: 'Last Location',
      value: d.lastLocationAgeSeconds < 0
        ? 'No fix yet'
        : `${d.lastLatitude.toFixed(6)}, ${d.lastLongitude.toFixed(6)}`,
      status: d.lastLocationAgeSeconds < 0 ? 'error'
        : d.lastLocationAgeSeconds < 300 ? 'ok'    // < 5 min = good
        : d.lastLocationAgeSeconds < 900 ? 'warn'  // < 15 min = warn
        : 'error',
    },
    {
      label: 'Location Age',
      value: formatAge(d.lastLocationAgeSeconds),
      status: d.lastLocationAgeSeconds < 0 ? 'error'
        : d.lastLocationAgeSeconds < 300 ? 'ok'
        : d.lastLocationAgeSeconds < 900 ? 'warn'
        : 'error',
      hint: d.lastLocationAgeSeconds > 900
        ? 'Stale location. GPS may be blocked or service restarting.'
        : undefined,
    },
    {
      label: 'Location Accuracy',
      value: formatAccuracy(d.lastLocationAccuracyMeters),
      status: d.lastLocationAccuracyMeters < 0 ? 'neutral'
        : d.lastLocationAccuracyMeters <= 30 ? 'ok'
        : d.lastLocationAccuracyMeters <= 100 ? 'warn'
        : 'error',
      hint: d.lastLocationAccuracyMeters > 100
        ? 'Poor accuracy. GPS may be obstructed or device indoors.'
        : undefined,
    },
    {
      label: 'Active Session',
      value: d.hasActiveSession ? 'Yes' : 'No',
      status: d.hasActiveSession ? 'ok' : 'neutral',
    },
    {
      label: 'Unsynced Native Events',
      value: String(d.unsyncedNativeEventCount),
      status: d.unsyncedNativeEventCount === 0 ? 'ok'
        : d.unsyncedNativeEventCount < 20 ? 'warn'
        : 'error',
      hint: d.unsyncedNativeEventCount > 0
        ? 'Events queued locally, will sync when online.'
        : undefined,
    },
  ];
}

export default function DiagnosticScreen() {
  const router = useRouter();
  const [diagnostics, setDiagnostics] = useState<LocationDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [flushResult, setFlushResult] = useState<string | null>(null);
  const [isFlushing, setIsFlushing] = useState(false);

  const fetch = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const data = await BackgroundLocation.getDiagnostics();
      setDiagnostics(data);
      setLastRefreshed(new Date());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to get diagnostics');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch + poll every 5 seconds
  useEffect(() => {
    fetch();
    const interval = setInterval(() => fetch(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetch]);

  const handleFlush = useCallback(async () => {
    setIsFlushing(true);
    setFlushResult(null);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const flushed = await BackgroundLocation.flushPendingEvents(supabaseUrl, supabaseKey);
      setFlushResult(`✓ Flushed ${flushed} event${flushed !== 1 ? 's' : ''}`);
      await fetch(true);
    } catch (e: any) {
      setFlushResult(`✗ ${e?.message ?? 'Flush failed'}`);
    } finally {
      setIsFlushing(false);
    }
  }, [fetch]);

  const rows = diagnostics ? buildRows(diagnostics, Date.now()) : [];
  const hasErrors = rows.some(r => r.status === 'error');
  const hasWarnings = rows.some(r => r.status === 'warn');
  const overallStatus: StatusType = hasErrors ? 'error' : hasWarnings ? 'warn' : 'ok';
  const overallLabel = hasErrors ? 'Issues Detected' : hasWarnings ? 'Warnings' : 'All Systems OK';

  return (
    <AnimatedScreen>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.headingText} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} fontType="bold">Location Diagnostics</Text>
          <Text style={styles.subtitle}>
            {lastRefreshed ? `Updated ${moment(lastRefreshed).format('HH:mm:ss')}` : 'Loading...'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetch(true)}
          disabled={isRefreshing}
        >
          {isRefreshing
            ? <ActivityIndicator size="small" color={theme.colors.primary} />
            : <Ionicons name="refresh-outline" size={22} color={theme.colors.primary} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Reading diagnostics...</Text>
          </View>
        ) : error ? (
          <Card style={styles.errorCard}>
            <Ionicons name="warning-outline" size={24} color={theme.colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHint}>
              This screen requires a real Android device with the native module installed.
            </Text>
          </Card>
        ) : (
          <>
            {/* Overall status banner */}
            <Card style={[styles.bannerCard, {
              backgroundColor: overallStatus === 'ok'
                ? theme.statusColors.successBackground
                : overallStatus === 'warn'
                ? theme.statusColors.warningBackground
                : '#FEE2E2',
              borderColor: overallStatus === 'ok'
                ? theme.statusColors.successText
                : overallStatus === 'warn'
                ? theme.statusColors.warningText
                : theme.colors.danger,
            }]}>
              <StatusDot status={overallStatus} />
              <Text style={[styles.bannerText, {
                color: overallStatus === 'ok'
                  ? theme.statusColors.successText
                  : overallStatus === 'warn'
                  ? theme.statusColors.warningText
                  : theme.colors.danger,
              }]} fontType="bold">
                {overallLabel}
              </Text>
              <Text style={styles.pollNote}>Auto-refreshes every 5s</Text>
            </Card>

            {/* Diagnostic rows */}
            <Card style={styles.tableCard}>
              {rows.map((row, i) => (
                <View key={row.label} style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
                  <View style={styles.rowLeft}>
                    <StatusDot status={row.status} />
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>{row.label}</Text>
                      {row.hint ? (
                        <Text style={styles.rowHint}>{row.hint}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={[styles.rowValue, {
                    color: row.status === 'ok' ? theme.colors.headingText
                      : row.status === 'warn' ? theme.statusColors.warningText
                      : row.status === 'error' ? theme.colors.danger
                      : theme.colors.disabledText
                  }]} fontType="medium">
                    {row.value}
                  </Text>
                </View>
              ))}
            </Card>

            {/* Flush button */}
            <Card style={styles.flushCard}>
              <View style={styles.flushRow}>
                <View style={styles.flushInfo}>
                  <Text style={styles.flushTitle} fontType="bold">Unsynced Event Queue</Text>
                  <Text style={styles.flushSub}>
                    {diagnostics
                      ? `${diagnostics.unsyncedNativeEventCount} event${diagnostics.unsyncedNativeEventCount !== 1 ? 's' : ''} waiting to sync`
                      : '—'}
                  </Text>
                  {flushResult ? (
                    <Text style={[styles.flushResult, {
                      color: flushResult.startsWith('✓') ? theme.colors.success : theme.colors.danger
                    }]} fontType="medium">
                      {flushResult}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.flushButton, isFlushing && styles.flushButtonDisabled]}
                  onPress={handleFlush}
                  disabled={isFlushing}
                >
                  {isFlushing
                    ? <ActivityIndicator size="small" color="white" />
                    : <Text style={styles.flushButtonText} fontType="bold">Flush Now</Text>
                  }
                </TouchableOpacity>
              </View>
            </Card>

            {/* Raw IDs for support */}
              {diagnostics?.hasActiveSession && (
              <Card style={styles.idsCard}>
                <Text style={styles.idsTitle} fontType="bold">Session Info</Text>
                <Text style={styles.idRow} numberOfLines={1}>
                  Worker: {diagnostics.workerId || '—'}
                </Text>
                <Text style={styles.idRow} numberOfLines={1}>
                  Assignment: {diagnostics.assignmentId || '—'}
                </Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    backgroundColor: theme.colors.pageBackground,
  },
  backButton: {
    padding: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
  },
  subtitle: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
    marginTop: 1,
  },
  refreshButton: {
    padding: theme.spacing(1),
  },
  content: {
    padding: theme.spacing(2),
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(6),
  },
  centered: {
    alignItems: 'center',
    paddingVertical: theme.spacing(6),
    gap: theme.spacing(2),
  },
  loadingText: {
    color: theme.colors.bodyText,
    fontSize: theme.fontSizes.md,
  },
  errorCard: {
    padding: theme.spacing(3),
    alignItems: 'center',
    gap: theme.spacing(1.5),
    borderColor: theme.colors.danger,
    borderWidth: 1,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.fontSizes.md,
    textAlign: 'center',
  },
  errorHint: {
    color: theme.colors.disabledText,
    fontSize: theme.fontSizes.sm,
    textAlign: 'center',
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(2),
    gap: theme.spacing(1.5),
    borderWidth: 1,
    borderRadius: theme.radius.lg,
  },
  bannerText: {
    flex: 1,
    fontSize: theme.fontSizes.md,
  },
  pollNote: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
  },
  tableCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1.5),
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: theme.spacing(1.5),
    marginRight: theme.spacing(2),
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
  },
  rowHint: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
    marginTop: 2,
    lineHeight: 16,
  },
  rowValue: {
    fontSize: theme.fontSizes.sm,
    textAlign: 'right',
    flexShrink: 0,
    maxWidth: 160,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  idsCard: {
    padding: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.lg,
    gap: theme.spacing(0.5),
  },
  flushCard: {
    padding: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.lg,
  },
  flushRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
  },
  flushInfo: {
    flex: 1,
    gap: 3,
  },
  flushTitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
  },
  flushSub: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
  },
  flushResult: {
    fontSize: theme.fontSizes.xs,
    marginTop: 2,
  },
  flushButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  flushButtonDisabled: {
    opacity: 0.6,
  },
  flushButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.sm,
  },
  idsTitle: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing(0.5),
  },
  idRow: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
