import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/Themed';
import { Button } from '../../components/Button';
import { EmployeesContext } from '../../context/EmployeesContext';
import moment from 'moment';

interface DashboardStats {
  totalWorkers: number;
  workersOnline: number;
  totalHoursToday: number;
  activeSessions: any[];
  monthToDateHours: number;
  activeProjectsCount: number;
  totalProjectsCount: number;
  plannedProjectsCount: number;
  plannedProjects: { id: string, name: string, address?: string }[];
  allProjects: Record<string, string>; // ID to Name map
  allLocations: Record<string, string>; // ID to Name map
  topWorkers: { name: string, hours: number }[];
  currentMonthYear: string;
  unassignedCount: number;
}

interface ActivityEvent {
  id: string;
  type: 'work_session' | 'location_event' | 'message';
  event: string;
  time: string;
  timestamp: Date;
  projectName?: string;
}

export default function NewManagerDashboard() {
  const router = useRouter();
  const { user, userCompanyId, userCompanyName, isLoading: isAuthLoading } = useSession();
  const employeesContext = useContext(EmployeesContext);

  const [stats, setStats] = useState<DashboardStats>({
    totalWorkers: 0,
    workersOnline: 0,
    totalHoursToday: 0,
    activeSessions: [],
    monthToDateHours: 0,
    activeProjectsCount: 0,
    totalProjectsCount: 0,
    plannedProjectsCount: 0,
    plannedProjects: [],
    allProjects: {},
    allLocations: {},
    topWorkers: [],
    currentMonthYear: moment().format('MMMM YYYY'),
    unassignedCount: 0,
  });
  
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const employees = employeesContext?.employees || [];
  const workers = useMemo(() => employees.filter(e => e.role === 'worker'), [employees]);
  const totalWorkersCount = workers.length;

  useEffect(() => {
    if (!userCompanyId) return;

    const fetchDashboardData = async () => {
      setIsLoadingStats(true);
      try {
        const todayStr = moment().format('YYYY-MM-DD');
        const today = moment().startOf('day').toISOString();
        const startOfMonth = moment().startOf('month').toISOString();
        const startOfWeek = moment().startOf('week').toISOString();

        // 1. Fetch active sessions
        const { data: activeSessions, error: activeError } = await supabase
          .from('work_sessions')
          .select('*, employees(full_name), worker_assignments(ref_id, ref_type)')
          .eq('company_id', userCompanyId)
          .is('end_time', null);

        if (activeError) throw activeError;

        // 2. Fetch today's and month's sessions for hours calculation
        const { data: monthSessions, error: sessionsError } = await supabase
          .from('work_sessions')
          .select('start_time, end_time, worker_id')
          .eq('company_id', userCompanyId)
          .gte('start_time', startOfMonth)
          .not('end_time', 'is', null);

        if (sessionsError) throw sessionsError;

        const calculateMinutes = (start: string, end: string) => {
          return moment(end).diff(moment(start), 'minutes');
        };

        const totalMinutesToday = monthSessions
          ?.filter(s => moment(s.start_time).isSameOrAfter(today))
          .reduce((acc, s) => acc + calculateMinutes(s.start_time, s.end_time!), 0) || 0;

        const totalMinutesMonth = monthSessions?.reduce((acc, s) => acc + calculateMinutes(s.start_time, s.end_time!), 0) || 0;

        // 3. Top Workers this month
        const monthlyWorkersMap: Record<string, number> = {};
        monthSessions?.forEach(s => {
          const mins = calculateMinutes(s.start_time, s.end_time!);
          monthlyWorkersMap[s.worker_id] = (monthlyWorkersMap[s.worker_id] || 0) + mins;
        });

        const topWorkers = Object.entries(monthlyWorkersMap)
          .map(([id, mins]) => ({
            name: workers.find(w => w.id === id)?.full_name || 'Worker',
            hours: Math.round((mins / 60) * 10) / 10
          }))
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 5); // Show top 5 for monthly overview

        // 4. Idle Workers (not clocked in)
        const onlineWorkerIds = new Set(activeSessions?.map(s => s.worker_id));
        const idleWorkers = workers
          .filter(w => !onlineWorkerIds.has(w.id))
          .map(w => w.full_name)
          .slice(0, 5);

        // 5. Unassigned workers for today (based on assignments table)
        const { data: todayAssignments, error: assignmentsError } = await supabase
          .from('worker_assignments')
          .select('worker_id, ref_id, ref_type')
          .eq('company_id', userCompanyId)
          .eq('assigned_date', todayStr);
        
        if (assignmentsError) console.error('Assignments Error:', assignmentsError);

        const assignedWorkerIds = new Set(todayAssignments?.map(a => a.worker_id));
        const unassignedCount = workers.filter(w => !assignedWorkerIds.has(w.id)).length;

        const plannedProjectIds = new Set(
          todayAssignments
            ?.filter(a => a.ref_type === 'project')
            .map(a => a.ref_id)
        );

        // 6. Fetch today's context data
        const [locationsRes, projectsRes, commonLocationsRes] = await Promise.all([
          supabase
            .from('location_events')
            .select(`
              id, 
              type, 
              created_at, 
              worker_id, 
              employees!location_events_worker_id_fkey(full_name),
              worker_assignments!location_events_assignment_id_fkey(
                ref_id,
                ref_type
              )
            `)
            .eq('company_id', userCompanyId)
            .gte('created_at', today)
            .in('type', ['enter_geofence', 'exit_geofence'])
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('projects')
            .select('id, name, address')
            .eq('company_id', userCompanyId),
          supabase
            .from('common_locations')
            .select('id, name, address')
            .eq('company_id', userCompanyId)
        ]);

        if (locationsRes.error) console.error('Locations Query Error:', locationsRes.error);
        if (projectsRes.error) console.error('Projects Query Error:', projectsRes.error);
        if (commonLocationsRes.error) console.error('Common Locations Query Error:', commonLocationsRes.error);

        const totalProjectsCount = projectsRes.data?.length || 0;
        const projectsMap = new Map((projectsRes.data || []).map(p => [p.id, p.name]));
        const locationsMap = new Map((commonLocationsRes.data || []).map(l => [l.id, l.name]));

        const plannedProjects = (projectsRes.data || [])
          .filter(p => plannedProjectIds.has(p.id))
          .map(p => ({ id: p.id, name: p.name, address: p.address }));

        // Calculate unique active project IDs from sessions
        const activeProjectIds = new Set();
        activeSessions?.forEach(s => {
          const assignment = Array.isArray(s.worker_assignments) ? s.worker_assignments[0] : s.worker_assignments;
          if (assignment?.ref_type === 'project') {
            activeProjectIds.add(assignment.ref_id);
          }
        });

        const allProjects = Object.fromEntries((projectsRes.data || []).map(p => [p.id, p.name]));
        const allLocations = Object.fromEntries((commonLocationsRes.data || []).map(l => [l.id, l.name]));

        setStats({
          totalWorkers: totalWorkersCount,
          workersOnline: activeSessions?.length || 0,
          totalHoursToday: Math.round((totalMinutesToday / 60) * 10) / 10,
          activeSessions: activeSessions || [],
          monthToDateHours: Math.round((totalMinutesMonth / 60) * 10) / 10,
          activeProjectsCount: activeProjectIds.size,
          totalProjectsCount,
          plannedProjectsCount: plannedProjectIds.size,
          plannedProjects,
          allProjects,
          allLocations,
          topWorkers,
          currentMonthYear: moment().format('MMMM YYYY'),
          unassignedCount,
        });

        const locationActivities: ActivityEvent[] = (locationsRes.data || []).map(l => {
          // Access the joined data via the explicit relationship names
          const assignment = (l as any).worker_assignments;
          const firstAssignment = Array.isArray(assignment) ? assignment[0] : assignment;
          
          let siteName = 'Site';
          if (firstAssignment) {
            if (firstAssignment.ref_type === 'project') {
              siteName = projectsMap.get(firstAssignment.ref_id) || 'Project';
            } else if (firstAssignment.ref_type === 'common_location') {
              siteName = locationsMap.get(firstAssignment.ref_id) || 'Location';
            }
          }

          const action = l.type === 'enter_geofence' ? 'entered' : 'exited';
          const employeeData = (l as any).employees;
          const workerName = (Array.isArray(employeeData) ? employeeData[0] : employeeData)?.full_name || 'Worker';

          return {
            id: l.id,
            type: 'location_event',
            event: `${workerName} ${action} ${siteName}`,
            time: moment(l.created_at).format('hh:mm A'),
            timestamp: new Date(l.created_at)
          };
        });

        setActivities(locationActivities);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchDashboardData();

    // Set up real-time subscriptions
    const sessionsChannel = supabase
      .channel('dashboard-sessions')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'work_sessions',
        filter: `company_id=eq.${userCompanyId}`
      }, () => fetchDashboardData())
      .subscribe();

    const locationsChannel = supabase
      .channel('dashboard-locations')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'location_events',
        filter: `company_id=eq.${userCompanyId}`
      }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(locationsChannel);
    };
  }, [userCompanyId, totalWorkersCount, workers]);

  if (isAuthLoading || isLoadingStats) {
    return (
      <AnimatedScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </AnimatedScreen>
    );
  }

  const estimatedPayroll = stats.monthToDateHours * 25; // Using default $25/hr as it's not in DB

  return (
    <AnimatedScreen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle} fontType="bold">Dashboard</Text>
          <Text style={styles.pageSubtitle}>{userCompanyName}</Text>
        </View>

        <View style={styles.dashboardContent}>
          <View style={styles.column}>
            {/* 1. Overview Cards */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle} fontType="bold">Overview</Text>
              <View style={styles.summaryCardsContainer}>
                <Card style={styles.summaryCard}>
                  <Text style={styles.summaryValue} fontType="bold">{totalWorkersCount}</Text>
                  <Text style={styles.summaryLabel}>Total Workers</Text>
                </Card>
                <Card style={styles.summaryCard}>
                  <Text style={styles.summaryValue} fontType="bold">{stats.workersOnline}</Text>
                  <Text style={styles.summaryLabel}>Workers Online</Text>
                </Card>
                <Card style={styles.summaryCard}>
                  <Text style={styles.summaryValue} fontType="bold">{stats.totalHoursToday}h</Text>
                  <Text style={styles.summaryLabel}>Hours Today</Text>
                </Card>
              </View>
            </Card>

            {/* 2. Today's Project Schedule */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle} fontType="bold">Today's Project Schedule</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue} fontType="bold">{stats.plannedProjectsCount} / {stats.totalProjectsCount}</Text>
                  <Text style={styles.statLabel}>Projects Planned</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue} fontType="bold">{stats.unassignedCount}</Text>
                  <Text style={styles.statLabel}>Unassigned Workers</Text>
                </View>
              </View>

              {stats.plannedProjects.length > 0 && (
                <View style={styles.projectListContainer}>
                  <Text style={styles.projectListTitle} fontType="bold">Scheduled Projects</Text>
                  {stats.plannedProjects.map(project => (
                    <TouchableOpacity 
                      key={project.id} 
                      style={styles.projectListItem}
                      onPress={() => router.push(`/(manager)/projects/${project.id}`)}
                    >
                      <View style={styles.projectListIcon}>
                        <Ionicons name="business-outline" size={18} color={theme.colors.primary} />
                      </View>
                      <View style={styles.projectListInfo}>
                        <Text style={styles.projectListName} fontType="medium">{project.name}</Text>
                        {project.address && (
                          <Text style={styles.projectListAddress} numberOfLines={1}>{project.address}</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.disabledText} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Button
                title="Manage Assignments"
                onPress={() => router.push('/(manager)/worker-assignments')}
                style={styles.outlineButton}
                textStyle={styles.outlineButtonText}
              />
            </Card>

            {/* 3. Active Workers List */}
            <Card style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle} fontType="bold">Workers Currently Online</Text>
                <Ionicons name="radio-button-on" size={16} color={theme.colors.success} />
              </View>
              {stats.activeSessions.length === 0 ? (
                <Text style={styles.emptyText}>No workers are currently clocked in.</Text>
              ) : (
                stats.activeSessions.map(session => (
                  <View key={session.id} style={styles.workerItem}>
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName} fontType="medium">
                        {(session.employees as any)?.full_name || 'Worker'}
                      </Text>
                      <Text style={styles.workerStatus}>
                        since {moment(session.start_time).format('hh:mm A')}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => router.push({ pathname: '/(manager)/map-overview', params: { workerId: session.worker_id } })}
                      style={styles.iconButton}
                    >
                      <Ionicons name="locate-outline" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </Card>

            {/* NEW: 4. Financial Snapshot */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle} fontType="bold">Financial Quick View (MTD)</Text>
              <View style={styles.financialRow}>
                <View>
                  <Text style={styles.financialLabel}>Total Hours</Text>
                  <Text style={styles.financialValue} fontType="bold">{stats.monthToDateHours}h</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.financialLabel}>Est. Payroll</Text>
                  <Text style={[styles.financialValue, { color: theme.colors.success }]} fontType="bold">
                    ${estimatedPayroll.toLocaleString()}
                  </Text>
                </View>
              </View>
              <Text style={styles.financialNote}>* Estimated at average $25/hr</Text>
            </Card>
          </View>

          <View style={styles.column}>
            {/* NEW: 5. Map Preview */}
            <Card style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle} fontType="bold">Live Map Preview</Text>
                <Ionicons name="map-outline" size={18} color={theme.colors.primary} />
              </View>
              <TouchableOpacity 
                style={styles.mapPreviewPlaceholder}
                onPress={() => router.push('/(manager)/map-overview')}
              >
                <View style={styles.mapOverlay}>
                  <Ionicons name="expand-outline" size={24} color="white" />
                  <Text style={styles.mapOverlayText}>Open Full Map</Text>
                </View>
                {/* Visual placeholder for map */}
                <View style={styles.mapGridLines}>
                  {[1,2,3,4,5].map(i => <View key={i} style={styles.gridLineH} />)}
                  {[1,2,3,4,5].map(i => <View key={i} style={styles.gridLineV} />)}
                  <View style={[styles.mapDot, { top: '30%', left: '40%' }]} />
                  <View style={[styles.mapDot, { top: '60%', left: '70%', backgroundColor: theme.colors.secondary }]} />
                </View>
              </TouchableOpacity>
            </Card>

            {/* 6. Real-time Activity Feed */}
            <Card style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle} fontType="bold">Live Activity Feed</Text>
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>Today</Text>
                </View>
              </View>
              {activities.length === 0 ? (
                <Text style={styles.emptyText}>No location activity today.</Text>
              ) : (
                activities.map(activity => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityIconContainer}>
                      <Ionicons 
                        name="location-outline" 
                        size={18} 
                        color={theme.colors.primary} 
                      />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText}>
                        {activity.event}
                      </Text>
                      <Text style={styles.activityTime}>{activity.time}</Text>
                    </View>
                  </View>
                ))
              )}
            </Card>

            {/* 7. Worker Utilization - Monthly */}
            <Card style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle} fontType="bold">Top Workers ({stats.currentMonthYear})</Text>
                <Ionicons name="trophy-outline" size={18} color={theme.colors.secondary} />
              </View>
              {stats.topWorkers.length === 0 ? (
                <Text style={styles.emptyText}>No hours logged this month.</Text>
              ) : (
                stats.topWorkers.map((worker, index) => (
                  <View key={index} style={styles.utilizationRow}>
                    <View style={styles.utilizationInfo}>
                      <Text style={styles.workerName} fontType="medium">{worker.name}</Text>
                      <View style={styles.utilizationBarBg}>
                        <View style={[styles.utilizationBarFill, { width: `${Math.min((worker.hours / 160) * 100, 100)}%` }]} />
                      </View>
                    </View>
                    <Text style={styles.utilizationValue} fontType="bold">{worker.hours}h</Text>
                  </View>
                ))
              )}
            </Card>

            {/* 8. Quick Actions */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle} fontType="bold">Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/(manager)/employees')}>
                  <Ionicons name="person-add-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.quickActionLabel}>Add Worker</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/(manager)/reports')}>
                  <Ionicons name="document-text-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.quickActionLabel}>Reports</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/(manager)/projects')}>
                  <Ionicons name="folder-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.quickActionLabel}>Projects</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/(manager)/subscription')}>
                  <Ionicons name="card-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.quickActionLabel}>Billing</Text>
                </TouchableOpacity>
              </View>
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
        paddingHorizontal: theme.spacing(4),
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
  pageHeader: {
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
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
  dashboardContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -theme.spacing(2),
  },
  column: {
    width: '100%',
    paddingHorizontal: theme.spacing(2),
    ...Platform.select({
      web: {
        width: '50%',
      },
    }),
  },
  sectionCard: {
    marginBottom: theme.spacing(2),
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
  },
  summaryCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
  },
  summaryCard: {
    flex: 1,
    padding: theme.spacing(2),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
  },
  summaryValue: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.primary,
  },
  summaryLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginTop: 4,
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
    flex: 1,
  },
  workerName: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  workerStatus: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  iconButton: {
    padding: theme.spacing(1),
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: theme.spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  activityIconContainer: {
    width: 32,
    alignItems: 'center',
    paddingTop: 2,
  },
  activityContent: {
    flex: 1,
    marginLeft: theme.spacing(1),
  },
  activityText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  activityTime: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.disabledText,
    paddingVertical: theme.spacing(2),
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  billingLabel: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  billingValue: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.borderColor,
    borderRadius: 4,
    marginBottom: theme.spacing(2),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  manageSubscriptionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    height: 48,
  },
  manageSubscriptionButtonText: {
    color: 'white',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing(2),
    height: 44,
  },
  outlineButtonText: {
    color: theme.colors.primary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
  },
  quickActionButton: {
    width: '47%',
    aspectRatio: 1.2,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(1),
  },
  quickActionLabel: {
    marginTop: theme.spacing(1),
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing(2),
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing(2),
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  statValue: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    marginBottom: 4,
  },
  financialValue: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
  },
  financialNote: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
    marginTop: theme.spacing(1),
    fontStyle: 'italic',
  },
  mapPreviewPlaceholder: {
    height: 150,
    backgroundColor: '#E5E7EB',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapOverlayText: {
    color: 'white',
    fontSize: theme.fontSizes.sm,
    fontWeight: 'bold',
    marginTop: 4,
  },
  mapGridLines: {
    flex: 1,
    padding: 10,
  },
  gridLineH: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 25,
  },
  gridLineV: {
    position: 'absolute',
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    top: 0,
    bottom: 0,
    left: 0, // This is just a base, we use a loop in JSX
  },
  mapDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: 'white',
  },
  utilizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
  },
  utilizationInfo: {
    flex: 1,
    marginRight: theme.spacing(2),
  },
  utilizationBarBg: {
    height: 6,
    backgroundColor: theme.colors.borderColor,
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
  },
  utilizationBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  utilizationValue: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  idleWorkersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
  idleBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.5),
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  idleBadgeText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
  },
  projectListContainer: {
    marginTop: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    paddingTop: theme.spacing(2),
  },
  projectListTitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1.5),
  },
  projectListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
  },
  projectListIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(1.5),
  },
  projectListInfo: {
    flex: 1,
  },
  projectListName: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
  },
  projectListAddress: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
    marginTop: 2,
  },
  todayBadge: {
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.5),
    borderRadius: theme.radius.pill,
  },
  todayBadgeText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
