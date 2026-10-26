import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { View, Text } from '~/components/Themed';
import { Button } from '~/components/Button';
import * as BackgroundLocation from 'background-location';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import { theme } from '~/theme';

export default function DiagnosticsScreen() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string>('Loading...');
  const [stats, setStats] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = async () => {
    try {
      const recentLogs = await BackgroundLocation.getRecentLogs(200);
      setLogs(recentLogs || 'No logs available');
      
      const logStats = await BackgroundLocation.getLogStats();
      setStats(logStats);
      
      const diag = await BackgroundLocation.getDiagnostics();
      setDiagnostics(diag);
    } catch (error) {
      console.error('Failed to load logs:', error);
      setLogs('Failed to load logs: ' + error);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const allLogs = await BackgroundLocation.exportLogs();
      
      if (Platform.OS === 'web') {
        // Web: download as file
        const blob = new Blob([allLogs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `location_tracking_logs_${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Logs downloaded');
      } else {
        // Native: save and share
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `location_logs_${timestamp}.txt`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        // Write file (ignoring deprecation warning for now - still works)
        try {
          await FileSystem.writeAsStringAsync(fileUri, allLogs);
        } catch (writeError) {
          // If write fails, just share the text directly
          console.warn('File write failed, sharing text directly:', writeError);
          if (Platform.OS === 'android') {
            // Android: can share text directly
            const { Share } = await import('react-native');
            await Share.share({
              message: allLogs,
              title: 'Location Tracking Logs',
            });
            return;
          }
        }
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/plain',
            dialogTitle: 'Export Location Tracking Logs',
          });
        } else {
          Alert.alert('Success', `Logs saved to: ${fileUri}`);
        }
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
      Alert.alert('Error', 'Failed to export logs: ' + error);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await BackgroundLocation.clearLogs();
              setLogs('Logs cleared');
              setStats(null);
              Alert.alert('Success', 'Logs cleared');
            } catch (error) {
              console.error('Failed to clear logs:', error);
              Alert.alert('Error', 'Failed to clear logs: ' + error);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Location Tracking Diagnostics</Text>
        <Text style={styles.subtitle}>
          View and export logs from your location tracking sessions
        </Text>
      </View>

      {diagnostics && (
        <View style={styles.diagnosticsCard}>
          <Text style={styles.sectionTitle}>Service Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Service Running:</Text>
            <Text style={[styles.statusValue, { color: diagnostics.serviceRunning ? '#4CAF50' : '#F44336' }]}>
              {diagnostics.serviceRunning ? '✅ Running' : '❌ Stopped'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Tracking Mode:</Text>
            <Text style={styles.statusValue}>
              {diagnostics.trackingMode || 'Unknown'} 
              {diagnostics.trackingMode === 'ACTIVE' ? ' 🚗' : ' 🏠'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Active Geofences:</Text>
            <Text style={styles.statusValue}>{diagnostics.geofenceCount || 0}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Has Active Session:</Text>
            <Text style={styles.statusValue}>
              {diagnostics.hasActiveSession ? '✅ Yes' : '❌ No'}
            </Text>
          </View>
          {diagnostics.unsyncedNativeEventCount > 0 && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Unsynced Events:</Text>
              <Text style={[styles.statusValue, { color: '#FF9800' }]}>
                ⚠️ {diagnostics.unsyncedNativeEventCount} (offline)
              </Text>
            </View>
          )}
          {diagnostics.lastLocationAgeSeconds >= 0 && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Location:</Text>
              <Text style={styles.statusValue}>
                {Math.floor(diagnostics.lastLocationAgeSeconds / 60)}m {diagnostics.lastLocationAgeSeconds % 60}s ago
              </Text>
            </View>
          )}
        </View>
      )}

      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Log File Statistics</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Total Size:</Text>
            <Text style={styles.statsValue}>{stats.total_size_mb} MB / {stats.max_size_mb} MB</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Lines:</Text>
            <Text style={styles.statsValue}>{stats.line_count}</Text>
          </View>
        </View>
      )}

      <View style={styles.actionsCard}>
        <Button
          title="Refresh Logs"
          onPress={handleRefresh}
          disabled={refreshing}
          style={styles.actionButton}
        />
        <Button
          title="Export All Logs"
          onPress={handleExport}
          style={styles.actionButton}
        />
        <Button
          title="Clear Logs"
          onPress={handleClear}
          variant="outline"
          style={styles.actionButton}
        />
      </View>

      <View style={styles.logsCard}>
        <Text style={styles.sectionTitle}>Recent Logs (Last 200 lines)</Text>
        <Text style={styles.hint}>
          Tip: Export logs after a test drive to review on your computer
        </Text>
        <ScrollView 
          style={styles.logsScrollView}
          nestedScrollEnabled
        >
          <Text style={styles.logsText}>{logs}</Text>
        </ScrollView>
      </View>

      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>📖 How to Use</Text>
        <Text style={styles.helpText}>
          1. Before testing, tap "Clear Logs" to start fresh{'\n'}
          2. Go for your test drive/work session{'\n'}
          3. Return and tap "Export All Logs"{'\n'}
          4. Share the file with support or review on your computer{'\n'}
          {'\n'}
          <Text style={styles.helpBold}>What to Look For:</Text>{'\n'}
          • "Mode switched" messages show ACTIVE/PASSIVE changes{'\n'}
          • "⚠️ AlarmManager FALLBACK" means gaps were detected{'\n'}
          • "✓ AlarmManager fallback" shows successful recovery{'\n'}
          • Regular timestamps = good tracking{'\n'}
          • Large gaps = potential issues
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statsCard: {
    margin: 16,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  diagnosticsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '30',
  },
  statusLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statsLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButton: {
    marginBottom: 12,
  },
  logsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  logsScrollView: {
    maxHeight: 400,
    backgroundColor: '#1e1e1e',
    borderRadius: 4,
    padding: 12,
  },
  logsText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    color: '#e0e0e0',
    lineHeight: 14,
  },
  helpCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.text,
  },
  helpBold: {
    fontWeight: '600',
  },
});
