import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSession } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons'; // For icons

// Mock Data (will replace with real data from contexts/supabase later)
const MOCKED_SUMMARY_DATA = {
  totalWorkers: 15,
  workersOnline: 10,
  totalHoursToday: 75.5,
  totalHoursThisWeek: 350.2,
  monthlyCostEstimate: 1250.00,
};

const MOCKED_ACTIVITY_FEED = [
  { id: '1', event: 'Worker John Doe clocked in', time: '08:03 AM' },
  { id: '2', event: 'Worker Jane Smith started a break', time: '09:41 AM' },
  { id: '3', event: 'Worker Mike Ross clocked out', time: '12:55 PM' },
  { id: '4', event: 'Worker Rachel Green missed scheduled shift', time: '09:00 AM' },
  { id: '5', event: 'Worker Harvey Specter completed Project Alpha', time: '04:30 PM' },
];

const MOCKED_WORKERS_DATA = [
  { id: 'w1', name: 'John Doe', status: 'Clocked In', todayHours: 8, weekHours: 40, redFlags: [] },
  { id: 'w2', name: 'Jane Smith', status: 'On Break', todayHours: 4, weekHours: 20, redFlags: [] },
  { id: 'w3', name: 'Mike Ross', status: 'Clocked Out', todayHours: 5, weekHours: 25, redFlags: ['Missing Clock-out'] },
  { id: 'w4', name: 'Harvey Specter', status: 'Clocked In', todayHours: 7, weekHours: 38, redFlags: ['Overtime Approaching'] },
];

const MOCKED_TIMESHEET_DATA = [
  { worker: 'John Doe', totalHours: 40, overtime: 0, missingEntries: 0, status: 'Approved' },
  { worker: 'Jane Smith', totalHours: 35, overtime: 3, missingEntries: 1, status: 'Pending' },
  { worker: 'Mike Ross', totalHours: 20, overtime: 0, missingEntries: 0, status: 'Approved' },
];

const MOCKED_SCHEDULE_DATA = [
  { worker: 'John Doe', status: 'On Site (Project Alpha)', late: false, absent: false },
  { worker: 'Jane Smith', status: 'On Break', late: false, absent: false },
  { worker: 'Mike Ross', status: 'Off Shift', late: false, absent: false },
  { worker: 'Rachel Green', status: 'Absent', late: true, absent: true },
];

const MOCKED_ALERTS_DATA = [
  { id: 'a1', type: 'warning', message: 'Worker Mike Ross: Missing clock-out for Project Beta.' },
  { id: 'a2', type: 'info', message: 'Worker Harvey Specter: Overtime approaching (38/40h).' },
  { id: 'a3', type: 'error', message: 'Subscription: 15/20 worker seats used. Consider upgrading.' },
];

export default function NewManagerDashboard() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useSession()!;

  const [organizationName, setOrganizationName] = useState('Your Organization');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isOrganizationLoading, setIsOrganizationLoading] = useState(true);

  // Fetch organization name on component mount or user change
  useEffect(() => {
    if (isUserLoading || !user) {
      setIsOrganizationLoading(true);
      return;
    }

    const orgId = user.app_metadata?.organization_id as string;
    const subStatus = user.app_metadata?.subscription_status as string;

    setOrganizationId(orgId);
    setSubscriptionStatus(subStatus);

    if (orgId && subStatus === 'active') {
      const fetchOrganizationName = async () => {
        const { data, error } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', orgId)
          .single();

        if (error) {
          console.error("Error fetching organization name:", error.message);
          setOrganizationName('Your Organization');
        } else if (data) {
          setOrganizationName(data.name || 'Your Organization');
        }
        setIsOrganizationLoading(false);
      };
      fetchOrganizationName();
    } else {
      setIsOrganizationLoading(false);
    }
  }, [user, isUserLoading]);


  if (isUserLoading || isOrganizationLoading) {
    return (
      <AnimatedScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </AnimatedScreen>
    );
  }

  // If subscription is not active, show CTA
  if (subscriptionStatus !== 'active' && organizationId) {
    return (
      <AnimatedScreen>
        <View style={styles.containerCenter}>
          <Text style={styles.title}>Subscription Not Active</Text>
          <Text style={styles.description}>
            It looks like your subscription is not active. Please complete your payment to access all features.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.replace('/subscription/setup')}
          >
            <Text style={styles.ctaButtonText}>Retry Payment</Text>
          </TouchableOpacity>
        </View>
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.welcomeText}>Welcome, Manager!</Text>
          <Text style={styles.organizationText}>{organizationName}</Text>
        </View>

        {/* 1. High-Level Summary Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.summaryCardsContainer}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{MOCKED_SUMMARY_DATA.totalWorkers}</Text>
              <Text style={styles.summaryLabel}>Total Workers</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{MOCKED_SUMMARY_DATA.workersOnline}</Text>
              <Text style={styles.summaryLabel}>Workers Online</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{MOCKED_SUMMARY_DATA.totalHoursToday}</Text>
              <Text style={styles.summaryLabel}>Hours Today</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{MOCKED_SUMMARY_DATA.totalHoursThisWeek}</Text>
              <Text style={styles.summaryLabel}>Hours This Week</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>€{MOCKED_SUMMARY_DATA.monthlyCostEstimate}</Text>
              <Text style={styles.summaryLabel}>Est. Monthly Cost</Text>
            </Card>
          </View>
        </View>

        {/* 2. Today’s Activity Feed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
          <Card>
            {MOCKED_ACTIVITY_FEED.map(activity => (
              <View key={activity.id} style={styles.activityItem}>
                <Text style={styles.activityText}>{activity.event}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            ))}
          </Card>
        </View>

        {/* 3. Workers Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workers</Text>
          <Card>
            {MOCKED_WORKERS_DATA.map(worker => (
              <View key={worker.id} style={styles.workerItem}>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Text style={styles.workerStatus}>{worker.status}</Text>
                </View>
                <View style={styles.workerHours}>
                  <Text>Today: {worker.todayHours}h</Text>
                  <Text>Week: {worker.weekHours}h</Text>
                </View>
                {worker.redFlags.length > 0 && (
                  <Text style={styles.workerRedFlags}>🚩 {worker.redFlags.join(', ')}</Text>
                )}
                <View style={styles.workerActions}>
                  <TouchableOpacity style={styles.workerActionButton}>
                    <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.workerActionButton}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addWorkerButton}>
                <Ionicons name="person-add-outline" size={20} color="white" />
                <Text style={styles.addWorkerButtonText}>Add/Invite Worker</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* 4. Timesheet Snapshot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timesheet Snapshot (Current Pay Period)</Text>
          <Card>
            {MOCKED_TIMESHEET_DATA.map(timesheet => (
              <View key={timesheet.worker} style={styles.timesheetItem}>
                <Text style={styles.timesheetWorker}>{timesheet.worker}</Text>
                <View style={styles.timesheetDetails}>
                  <Text>Total: {timesheet.totalHours}h</Text>
                  {timesheet.overtime > 0 && <Text style={styles.timesheetOvertime}>Overtime: {timesheet.overtime}h</Text>}
                  {timesheet.missingEntries > 0 && <Text style={styles.timesheetMissing}>Missing: {timesheet.missingEntries}</Text>}
                </View>
                <TouchableOpacity style={styles.approveButton}>
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.exportButton}>
                <Ionicons name="download-outline" size={20} color={theme.colors.bodyText} />
                <Text style={styles.exportButtonText}>Export Timesheets</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* 5. Schedule Snapshot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Snapshot (Today)</Text>
          <Card>
            {MOCKED_SCHEDULE_DATA.map(schedule => (
              <View key={schedule.worker} style={styles.scheduleItem}>
                <Text style={styles.scheduleWorker}>{schedule.worker}</Text>
                <Text>{schedule.status}</Text>
                {schedule.late && <Text style={styles.scheduleLate}>Late</Text>}
                {schedule.absent && <Text style={styles.scheduleAbsent}>Absent</Text>}
              </View>
            ))}
          </Card>
        </View>

        {/* 6. Alerts & Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alerts & Tasks</Text>
          <Card>
            {MOCKED_ALERTS_DATA.map(alert => (
              <View key={alert.id} style={[styles.alertItem, alert.type === 'error' && styles.alertError, alert.type === 'warning' && styles.alertWarning]}>
                <Ionicons name={alert.type === 'error' ? 'alert-circle-outline' : alert.type === 'warning' ? 'warning-outline' : 'information-circle-outline'} size={20} color={alert.type === 'error' ? theme.colors.danger : alert.type === 'warning' ? 'orange' : theme.colors.primary} />
                <Text style={styles.alertText}>{alert.message}</Text>
              </View>
            ))}
          </Card>
        </View>

        {/* 7. Billing & Subscription Quick View */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing & Subscription</Text>
          <Card style={styles.billingCard}>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Current Plan:</Text>
              <Text style={styles.billingValue}>Standard (20 Workers)</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Workers Used:</Text>
              <Text style={styles.billingValue}>15/20</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Billing Cycle:</Text>
              <Text style={styles.billingValue}>Monthly</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Next Invoice:</Text>
              <Text style={styles.billingValue}>Dec 1, 2025</Text>
            </View>
            <TouchableOpacity style={styles.manageSubscriptionButton}>
              <Text style={styles.manageSubscriptionButtonText}>Manage Subscription</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: theme.spacing(4),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  containerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(2),
  },
  description: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(4),
    borderRadius: theme.radius.md,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerContainer: {
    padding: theme.spacing(3),
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: theme.colors.borderColor,
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  organizationText: {
    fontSize: 18,
    color: theme.colors.bodyText,
    marginTop: theme.spacing(0.5),
  },
  section: {
    margin: theme.spacing(2),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      native: {
        elevation: 8,
      }
    }),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  summaryCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48%', // Roughly half width for two cards per row
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.bodyText,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  activityText: {
    fontSize: 15,
    color: theme.colors.bodyText,
  },
  activityTime: {
    fontSize: 14,
    color: theme.colors.bodyText,
    fontWeight: 'bold',
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    justifyContent: 'space-between',
  },
  workerInfo: {
    flex: 2,
    flexDirection: 'column',
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  workerStatus: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  workerHours: {
    flex: 1,
    alignItems: 'flex-end',
  },
  workerRedFlags: {
    fontSize: 14,
    color: theme.colors.danger,
    marginLeft: theme.spacing(1),
  },
  workerActions: {
    flexDirection: 'row',
    marginLeft: theme.spacing(1),
  },
  workerActionButton: {
    marginLeft: theme.spacing(1),
    padding: theme.spacing(0.5),
  },
  addWorkerButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing(2),
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addWorkerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: theme.spacing(1),
  },
  timesheetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  timesheetWorker: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  timesheetDetails: {
    flexDirection: 'row',
    gap: theme.spacing(1),
  },
  timesheetOvertime: {
    color: 'orange',
    fontWeight: 'bold',
  },
  timesheetMissing: {
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
  approveButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.md,
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
  },
  exportButtonText: {
    marginLeft: theme.spacing(1),
    color: theme.colors.bodyText,
    fontWeight: 'bold',
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  scheduleWorker: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  scheduleLate: {
    color: 'orange',
    fontWeight: 'bold',
  },
  scheduleAbsent: {
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  alertError: {
    // backgroundColor: '#FFEBEE', // light red background
  },
  alertWarning: {
    // backgroundColor: '#FFF3E0', // light orange background
  },
  alertText: {
    marginLeft: theme.spacing(1),
    fontSize: 15,
    color: theme.colors.bodyText,
  },
  billingCard: {
    padding: theme.spacing(3),
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(0.5),
  },
  billingLabel: {
    fontSize: 15,
    color: theme.colors.bodyText,
  },
  billingValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  manageSubscriptionButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
    alignItems: 'center',
  },
  manageSubscriptionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
