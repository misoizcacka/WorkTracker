import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSession } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons'; // For icons
import { Text } from '../../components/Themed'; // Import Themed Text
import { Button } from '../../components/Button';


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
          <Text style={styles.pageTitle}>Subscription Not Active</Text>
          <Text style={styles.pageSubtitle}>
            It looks like your subscription is not active. Please complete your payment to access all features.
          </Text>
          <Button
            title="Retry Payment"
            onPress={() => router.replace('/subscription/setup')}
            style={styles.ctaButton}
            textStyle={styles.ctaButtonText}
          />
        </View>
      </AnimatedScreen>
    );
  }

    return (
      <AnimatedScreen>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle} fontType="bold">Dashboard</Text>
            <Text style={styles.pageSubtitle}>{organizationName}</Text>
          </View>
  
          <View style={styles.dashboardContent}>
            <View style={styles.column}>
              {/* 1. High-Level Summary Cards */}
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle} fontType="bold">Overview</Text>
                <View style={styles.summaryCardsContainer}>
                  <Card style={styles.summaryCard}>
                    <Text style={styles.summaryValue} fontType="bold">{MOCKED_SUMMARY_DATA.totalWorkers}</Text>
                    <Text style={styles.summaryLabel} fontType="regular">Total Workers</Text>
                  </Card>
                  <Card style={styles.summaryCard}>
                    <Text style={styles.summaryValue} fontType="bold">{MOCKED_SUMMARY_DATA.workersOnline}</Text>
                    <Text style={styles.summaryLabel} fontType="regular">Workers Online</Text>
                  </Card>
                  <Card style={styles.summaryCard}>
                    <Text style={styles.summaryValue} fontType="bold">{MOCKED_SUMMARY_DATA.totalHoursToday}</Text>
                    <Text style={styles.summaryLabel} fontType="regular">Hours Today</Text>
                  </Card>
                  <Card style={styles.summaryCard}>
                    <Text style={styles.summaryValue} fontType="bold">{MOCKED_SUMMARY_DATA.totalHoursThisWeek}</Text>
                    <Text style={styles.summaryLabel} fontType="regular">Hours This Week</Text>
                  </Card>
                  <Card style={styles.summaryCard}>
                    <Text style={styles.summaryValue} fontType="bold">€{MOCKED_SUMMARY_DATA.monthlyCostEstimate}</Text>
                    <Text style={styles.summaryLabel} fontType="regular">Est. Monthly Cost</Text>
                  </Card>
                </View>
              </Card>
  
              {/* 3. Workers Overview */}
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle} fontType="bold">Workers</Text>
                {MOCKED_WORKERS_DATA.map(worker => (
                  <View key={worker.id} style={styles.workerItem}>
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName} fontType="medium">{worker.name}</Text>
                      <Text style={styles.workerStatus} fontType="regular">{worker.status}</Text>
                    </View>
                    <View style={styles.workerHours}>
                      <Text fontType="regular">Today: {worker.todayHours}h</Text>
                      <Text fontType="regular">Week: {worker.weekHours}h</Text>
                    </View>
                    {worker.redFlags.length > 0 && (
                      <Text style={styles.workerRedFlags} fontType="regular">🚩 {worker.redFlags.join(', ')}</Text>
                    )}
                    <View style={styles.workerActions}>
                      <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="create-outline" size={theme.fontSizes.lg} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="trash-outline" size={theme.fontSizes.lg} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <Button
                  onPress={() => {}} // TODO: Add actual onPress handler
                  style={styles.addWorkerButton}
                >
                  <Ionicons name="person-add-outline" size={theme.fontSizes.lg} color="white" />
                  <Text style={styles.addWorkerButtonText}>Add/Invite Worker</Text>
                </Button>
              </Card>
  
              {/* 5. Schedule Snapshot */}
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle} fontType="bold">Schedule Snapshot (Today)</Text>
                {MOCKED_SCHEDULE_DATA.map(schedule => (
                  <View key={schedule.worker} style={styles.scheduleItem}>
                    <Text style={styles.scheduleWorker} fontType="medium">{schedule.worker}</Text>
                    <Text fontType="regular">{schedule.status}</Text>
                    {schedule.late && <Text style={styles.scheduleLate} fontType="regular">Late</Text>}
                    {schedule.absent && <Text style={styles.scheduleAbsent} fontType="regular">Absent</Text>}
                  </View>
                ))}
              </Card>
  
              {/* 7. Billing & Subscription Quick View */}
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle} fontType="bold">Billing & Subscription</Text>
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel} fontType="regular">Current Plan:</Text>
                  <Text style={styles.billingValue} fontType="medium">Standard (20 Workers)</Text>
                </View>
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel} fontType="regular">Workers Used:</Text>
                  <Text style={styles.billingValue} fontType="medium">15/20</Text>
                </View>
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel} fontType="regular">Billing Cycle:</Text>
                  <Text style={styles.billingValue} fontType="medium">Monthly</Text>
                </View>
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel} fontType="regular">Next Invoice:</Text>
                  <Text style={styles.billingValue} fontType="medium">Dec 1, 2025</Text>
                </View>
                <Button
                  title="Manage Subscription"
                  onPress={() => {}} // TODO: Add actual onPress handler
                  style={styles.manageSubscriptionButton}
                  textStyle={styles.manageSubscriptionButtonText}
                  fontType="regular"
                />
              </Card>
            </View>
  
            <View style={styles.column}>
              {/* 2. Today’s Activity Feed */}
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle} fontType="bold">Today's Activity</Text>
                {MOCKED_ACTIVITY_FEED.map(activity => (
                  <View key={activity.id} style={styles.activityItem}>
                    <Text style={styles.activityText} fontType="regular">{activity.event}</Text>
                    <Text style={styles.activityTime} fontType="medium">{activity.time}</Text>
                  </View>
                ))}
              </Card>
  
              {/* 4. Timesheet Snapshot */}
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle} fontType="bold">Timesheet Snapshot (Current Pay Period)</Text>
                {MOCKED_TIMESHEET_DATA.map(timesheet => (
                  <View key={timesheet.worker} style={styles.timesheetItem}>
                    <Text style={styles.timesheetWorker} fontType="medium">{timesheet.worker}</Text>
                    <View style={styles.timesheetDetails}>
                      <Text fontType="regular">Total: {timesheet.totalHours}h</Text>
                      {timesheet.overtime > 0 && <Text style={styles.timesheetOvertime} fontType="regular">Overtime: {timesheet.overtime}h</Text>}
                      {timesheet.missingEntries > 0 && <Text style={styles.timesheetMissing} fontType="regular">Missing: {timesheet.missingEntries}</Text>}
                    </View>
                    <Button
                      title="Approve"
                      onPress={() => {}} // TODO: Add actual onPress handler
                      style={styles.approveButton}
                      textStyle={styles.approveButtonText}
                      fontType="regular"
                    />
                  </View>
                ))}
                <Button
                  onPress={() => {}} // TODO: Add actual onPress handler
                  style={styles.exportButton}
                >
                  <Ionicons name="download-outline" size={theme.fontSizes.lg} color={theme.colors.bodyText} />
                  <Text style={styles.exportButtonText}>Export Timesheets</Text>
                </Button>
              </Card>
  
              {/* 6. Alerts & Tasks */}
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle} fontType="bold">Alerts & Tasks</Text>
                {MOCKED_ALERTS_DATA.map(alert => (
                  <View key={alert.id} style={[styles.alertItem, alert.type === 'error' && styles.alertError, alert.type === 'warning' && styles.alertWarning]}>
                    <Ionicons name={alert.type === 'error' ? 'alert-circle-outline' : alert.type === 'warning' ? 'warning-outline' : 'information-circle-outline'} size={theme.fontSizes.lg} color={alert.type === 'error' ? theme.colors.danger : alert.type === 'warning' ? 'orange' : theme.colors.primary} />
                    <Text style={styles.alertText} fontType="regular">{alert.message}</Text>
                  </View>
                ))}
              </Card>
            </View>
          </View>
        </ScrollView>
      </AnimatedScreen>
    );
  }
const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: theme.spacing(4),
    ...Platform.select({
      web: {
        maxWidth: 1400,
        alignSelf: 'center',
        paddingHorizontal: theme.spacing(4), // Add horizontal padding for web
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing(2),
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  containerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
    backgroundColor: theme.colors.background,
  },
  // New styles for the main page header
  pageHeader: {
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.background,
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  pageSubtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.bodyText,
  },
  // Dashboard Content Layout
  dashboardContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -theme.spacing(2), // Counteract column padding
  },
  column: {
    width: '100%', // Default to full width on small screens
    paddingHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2), // Add vertical spacing between columns/cards
    ...Platform.select({
      web: {
        width: '49%', // Two columns on large screens
      },
    }),
  },
  sectionCard: {
    marginBottom: theme.spacing(2),
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing(4),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      native: {
        elevation: 6,
      },
    }),
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(3),
  },
  // Summary Cards
  summaryCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    // marginHorizontal: -theme.spacing(1), // Already handled by parent sectionCard
  },
  summaryCard: {
    width: '48%',
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background, // Slightly different background for sub-cards
  },
  summaryValue: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
  },
  summaryLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    textAlign: 'center',
  },
  // Activity Feed
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  activityText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  activityTime: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  // Workers Overview
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
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  workerStatus: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
  },
  workerHours: {
    flex: 1,
    alignItems: 'flex-end',
  },
  workerRedFlags: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.danger,
    marginLeft: theme.spacing(1),
  },
  workerActions: {
    flexDirection: 'row',
    marginLeft: theme.spacing(1),
  },
  iconButton: {
    padding: theme.spacing(0.5),
  },
  addWorkerButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addWorkerButtonText: {
    color: 'white',
    fontSize: 18,
    marginLeft: theme.spacing(1),
  },
  // Timesheet Snapshot
  timesheetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  timesheetWorker: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  timesheetDetails: {
    flexDirection: 'row',
    gap: theme.spacing(1),
  },
  timesheetOvertime: {
    color: 'orange',
  },
  timesheetMissing: {
    color: theme.colors.danger,
  },
  approveButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.lg,
  },
  approveButtonText: {
    color: 'white',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing(3),
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
  },
  exportButtonText: {
    marginLeft: theme.spacing(1),
    color: theme.colors.bodyText,
    fontSize: 18,
  },
  // Schedule Snapshot
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  scheduleWorker: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  scheduleLate: {
    color: 'orange',
  },
  scheduleAbsent: {
    color: theme.colors.danger,
  },
  // Alerts & Tasks
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  alertError: {
    // backgroundColor: theme.colors.errorBackground, // light red background
  },
  alertWarning: {
    // backgroundColor: theme.colors.warningMuted, // light orange background
  },
  alertText: {
    marginLeft: theme.spacing(1),
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  // Billing & Subscription
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1),
  },
  billingLabel: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  billingValue: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  manageSubscriptionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing(3),
    alignItems: 'center',
  },
  manageSubscriptionButtonText: {
    color: 'white',
  },
  ctaButton: { // Used for "Retry Payment"
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(5),
    paddingVertical: theme.spacing(2.5),
    borderRadius: theme.radius.lg,
    alignSelf: 'center', // Center the button
    marginTop: theme.spacing(4),
  },
  ctaButtonText: { // Used for "Retry Payment"
    color: 'white',
  },
});
