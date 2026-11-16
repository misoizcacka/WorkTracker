import React, { useState, useEffect, useMemo, useContext } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, TextInput, FlatList } from 'react-native';
import { Text } from '../../../components/Themed';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { supabase } from '../../../utils/supabase';
import { WorkSession } from '~/types';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { EmployeesContext, EmployeesContextType } from '../../../context/EmployeesContext';
import { useSession } from '~/context/AuthContext';
import moment from 'moment';
import { getCurrencySymbol } from '../../../utils/currency';
import UserAvatar from '../../../components/UserAvatar';

interface WorkerTimesheetData {
  worker_id: string;
  employee_number: string | null;
  worker_name: string;
  sessions: WorkSession[];
  total_work_hours: number;
  total_break_minutes: number;
  total_correction_minutes: number;
  payable_hours: number;
  effective_hourly_rate: number | null;
  total_pay: number | null;
}

const WorkerTimesheetReport = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { employees } = useContext(EmployeesContext) as EmployeesContextType;
  const { userCompanyCountry } = useSession();
  const currency = getCurrencySymbol(userCompanyCountry);

  const workers = useMemo(
    () => employees.filter(emp => emp.role === 'worker' && emp.status === 'active'),
    [employees]
  );

  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(
    typeof params.workerId === 'string' ? params.workerId : null
  );
  
  // Parse month from URL params (format: YYYY-MM)
  const initialMonth = useMemo(() => {
    if (typeof params.month === 'string') {
      const parsed = moment(params.month, 'YYYY-MM');
      if (parsed.isValid()) {
        return { month: parsed.month() + 1, year: parsed.year() };
      }
    }
    return { month: moment().month() + 1, year: moment().year() };
  }, [params.month]);
  
  const [selectedMonth, setSelectedMonth] = useState(initialMonth.month);
  const [selectedYear, setSelectedYear] = useState(initialMonth.year);
  const [timesheetData, setTimesheetData] = useState<WorkerTimesheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredWorkers = useMemo(() => {
    return workers.filter(worker =>
      worker.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workers, searchTerm]);

  const selectedWorker = useMemo(
    () => workers.find(w => w.id === selectedWorkerId),
    [workers, selectedWorkerId]
  );

  useEffect(() => {
    if (!selectedWorkerId) {
      setTimesheetData(null);
      return;
    }

    const fetchTimesheetData = async () => {
      setLoading(true);
      try {
        const startOfMonth = moment().year(selectedYear).month(selectedMonth - 1).startOf('month').toISOString();
        const endOfMonth = moment().year(selectedYear).month(selectedMonth - 1).endOf('month').toISOString();

        // Fetch sessions
        const { data: sessions, error: sessionsError } = await supabase
          .from('work_sessions')
          .select('*')
          .eq('worker_id', selectedWorkerId)
          .gte('start_time', startOfMonth)
          .lte('start_time', endOfMonth)
          .order('start_time', { ascending: true });

        if (sessionsError) throw sessionsError;

        // Fetch payroll summary for this worker
        const { data: payrollData, error: payrollError } = await supabase.rpc('get_monthly_payroll_report', {
          report_year: selectedYear,
          report_month: selectedMonth,
        });

        if (payrollError) throw payrollError;

        const workerPayroll = (payrollData || []).find((row: any) => row.worker_id === selectedWorkerId);

        setTimesheetData({
          worker_id: selectedWorkerId,
          employee_number: selectedWorker?.employee_number || null,
          worker_name: selectedWorker?.full_name || 'Worker',
          sessions: sessions || [],
          total_work_hours: workerPayroll?.total_work_hours || 0,
          total_break_minutes: workerPayroll?.total_break_minutes || 0,
          total_correction_minutes: workerPayroll?.total_correction_minutes || 0,
          payable_hours: workerPayroll?.payable_hours || 0,
          effective_hourly_rate: workerPayroll?.effective_hourly_rate || null,
          total_pay: workerPayroll?.total_pay || null,
        });
      } catch (error) {
        console.error('Error fetching timesheet data:', error);
        setTimesheetData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTimesheetData();
  }, [selectedWorkerId, selectedMonth, selectedYear, selectedWorker]);

  const handlePrevMonth = () => {
    const newDate = moment({ year: selectedYear, month: selectedMonth - 1 }).subtract(1, 'month');
    setSelectedYear(newDate.year());
    setSelectedMonth(newDate.month() + 1);
  };

  const handleNextMonth = () => {
    const newDate = moment({ year: selectedYear, month: selectedMonth - 1 }).add(1, 'month');
    setSelectedYear(newDate.year());
    setSelectedMonth(newDate.month() + 1);
  };

  const renderWorkerItem = ({ item }: { item: typeof workers[0] }) => {
    const isSelected = selectedWorkerId === item.id;
    return (
      <TouchableOpacity
        onPress={() => setSelectedWorkerId(item.id)}
        style={[styles.workerItem, isSelected && styles.selectedWorkerItem]}
      >
        <Ionicons
          name={isSelected ? "person" : "person-outline"}
          size={20}
          color={isSelected ? theme.colors.primary : theme.colors.bodyText}
          style={styles.workerIcon}
        />
        <View style={styles.workerInfo}>
          <Text
            style={[styles.workerName, isSelected && styles.selectedWorkerText]}
            fontType="medium"
            numberOfLines={1}
          >
            {item.full_name}
          </Text>
          {item.employee_number && (
            <Text style={styles.workerSubtext} fontType="regular">
              #{item.employee_number}
            </Text>
          )}
        </View>
        {isSelected && <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />}
      </TouchableOpacity>
    );
  };

  const renderSessionRow = (session: WorkSession) => {
    const isActive = !session.end_time;
    const duration = session.end_time
      ? (moment(session.end_time).diff(moment(session.start_time), 'minutes') - session.total_break_minutes) / 60
      : 0;

    return (
      <View key={session.id} style={styles.sessionRow}>
        <View style={styles.sessionDateCell}>
          <Text style={styles.sessionDateText} fontType="medium">
            {moment(session.start_time).format('MMM D')}
          </Text>
          <Text style={styles.sessionDayText} fontType="regular">
            {moment(session.start_time).format('ddd')}
          </Text>
        </View>
        <View style={styles.sessionTimeCell}>
          <Text style={styles.sessionTimeText} fontType="regular">
            {moment(session.start_time).format('HH:mm')}
          </Text>
        </View>
        <View style={styles.sessionTimeCell}>
          <Text style={styles.sessionTimeText} fontType="regular">
            {session.end_time ? moment(session.end_time).format('HH:mm') : '—'}
          </Text>
          {isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText} fontType="bold">ACTIVE</Text>
            </View>
          )}
        </View>
        <View style={styles.sessionDurationCell}>
          <Text style={styles.sessionDurationText} fontType="medium">
            {session.end_time ? `${duration.toFixed(1)}h` : '—'}
          </Text>
        </View>
        <View style={styles.sessionBreakCell}>
          <Text style={styles.sessionBreakText} fontType="regular">
            {session.total_break_minutes}m
          </Text>
        </View>
        <View style={styles.sessionCorrectionCell}>
          <Text
            style={[
              styles.sessionCorrectionText,
              { color: session.correction_minutes >= 0 ? theme.colors.success : theme.colors.danger }
            ]}
            fontType="medium"
          >
            {session.correction_minutes >= 0 ? '+' : ''}{session.correction_minutes}m
          </Text>
        </View>
        <View style={styles.sessionActionsCell}>
          <TouchableOpacity
            style={styles.sessionActionButton}
            onPress={() => router.push({
              pathname: '/(manager)/location-replay',
              params: { workerId: selectedWorkerId, date: moment(session.start_time).format('YYYY-MM-DD') }
            })}
          >
            <Ionicons name="map-outline" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.push('/reports')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.headingText} />
        </TouchableOpacity>
        <View>
          <Text style={styles.pageTitle} fontType="bold">Worker Timesheet</Text>
          <Text style={styles.pageSubtitle}>View detailed work sessions and hours for any worker.</Text>
        </View>
      </View>

      <View style={styles.mainContentCard}>
        <View style={styles.mainLayout}>
          {/* Left Panel: Worker Selection */}
          <View style={styles.leftPanel}>
            <Text style={styles.panelTitle} fontType="bold">Select Worker</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color={theme.colors.bodyText} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search workers..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor={theme.colors.bodyText}
              />
            </View>

            <FlatList
              data={filteredWorkers}
              renderItem={renderWorkerItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.workerListContent}
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* Right Panel: Timesheet Data */}
          <View style={styles.rightPanel}>
            {!selectedWorkerId ? (
              <Card style={styles.emptyStateCard}>
                <Ionicons name="people-outline" size={64} color={theme.colors.borderColor} />
                <Text style={styles.emptyStateText} fontType="medium">Select a worker to view timesheet</Text>
              </Card>
            ) : loading ? (
              <Card style={styles.emptyStateCard}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.emptyStateText} fontType="medium">Loading timesheet...</Text>
              </Card>
            ) : timesheetData ? (
              <>
                {/* Worker Info Header */}
                <Card style={styles.workerInfoCard}>
                  <View style={styles.workerHeaderRow}>
                    <View style={styles.workerHeaderLeft}>
                      <UserAvatar 
                        avatarUrl={selectedWorker?.avatar_url} 
                        size={56} 
                        style={styles.workerAvatar}
                      />
                      <View style={styles.workerHeaderTextContainer}>
                        <Text style={styles.workerHeaderName} fontType="bold">{timesheetData.worker_name}</Text>
                        {timesheetData.employee_number && (
                          <Text style={styles.workerHeaderSubtext} fontType="regular">
                            Employee #{timesheetData.employee_number}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.monthNavigator}>
                      <TouchableOpacity style={styles.monthNavButton} onPress={handlePrevMonth}>
                        <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <Text style={styles.monthText} fontType="bold">
                        {moment({ year: selectedYear, month: selectedMonth - 1 }).format('MMMM YYYY')}
                      </Text>
                      <TouchableOpacity style={styles.monthNavButton} onPress={handleNextMonth}>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Summary Stats */}
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryValue} fontType="bold">{timesheetData.payable_hours.toFixed(1)}h</Text>
                      <Text style={styles.summaryLabel}>Payable Hours</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryValue} fontType="bold">{timesheetData.sessions.length}</Text>
                      <Text style={styles.summaryLabel}>Sessions</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryValue} fontType="bold">{timesheetData.total_break_minutes}m</Text>
                      <Text style={styles.summaryLabel}>Total Breaks</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text
                        style={[
                          styles.summaryValue,
                          { color: timesheetData.total_correction_minutes >= 0 ? theme.colors.success : theme.colors.danger }
                        ]}
                        fontType="bold"
                      >
                        {timesheetData.total_correction_minutes >= 0 ? '+' : ''}{timesheetData.total_correction_minutes}m
                      </Text>
                      <Text style={styles.summaryLabel}>Corrections</Text>
                    </View>
                    {timesheetData.total_pay !== null && (
                      <View style={styles.summaryBox}>
                        <Text style={[styles.summaryValue, { color: theme.colors.success }]} fontType="bold">
                          {currency}{timesheetData.total_pay.toFixed(2)}
                        </Text>
                        <Text style={styles.summaryLabel}>Total Pay</Text>
                      </View>
                    )}
                  </View>
                </Card>

                {/* Sessions Table */}
                <Card style={styles.sessionsCard}>
                  {timesheetData.sessions.length === 0 ? (
                    <View style={styles.noSessionsContainer}>
                      <Ionicons name="calendar-outline" size={48} color={theme.colors.borderColor} />
                      <Text style={styles.noSessionsText} fontType="medium">No sessions for this month</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.sessionsTableHeader}>
                        <View style={styles.sessionDateCell}>
                          <Text style={styles.tableHeaderText} fontType="bold">Date</Text>
                        </View>
                        <View style={styles.sessionTimeCell}>
                          <Text style={styles.tableHeaderText} fontType="bold">Start</Text>
                        </View>
                        <View style={styles.sessionTimeCell}>
                          <Text style={styles.tableHeaderText} fontType="bold">End</Text>
                        </View>
                        <View style={styles.sessionDurationCell}>
                          <Text style={styles.tableHeaderText} fontType="bold">Duration</Text>
                        </View>
                        <View style={styles.sessionBreakCell}>
                          <Text style={styles.tableHeaderText} fontType="bold">Break</Text>
                        </View>
                        <View style={styles.sessionCorrectionCell}>
                          <Text style={styles.tableHeaderText} fontType="bold">Correction</Text>
                        </View>
                        <View style={styles.sessionActionsCell}>
                          <Text style={styles.tableHeaderText} fontType="bold"></Text>
                        </View>
                      </View>
                      <ScrollView style={styles.sessionsScrollView} contentContainerStyle={styles.sessionsContent}>
                        {timesheetData.sessions.map(renderSessionRow)}
                      </ScrollView>
                    </>
                  )}
                </Card>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.background,
    gap: theme.spacing(2),
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  pageTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  pageSubtitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  mainContentCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    overflow: 'hidden',
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      native: { elevation: 6 },
    }),
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: 280,
    backgroundColor: theme.colors.cardBackground,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(2),
  },
  rightPanel: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing(2),
  },
  panelTitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    paddingHorizontal: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
    height: 40,
  },
  searchIcon: {
    marginRight: theme.spacing(1),
  },
  searchInput: {
    flex: 1,
    color: theme.colors.headingText,
    fontSize: theme.fontSizes.sm,
  },
  workerListContent: {
    paddingBottom: theme.spacing(2),
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(1),
    backgroundColor: theme.colors.pageBackground,
  },
  selectedWorkerItem: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  workerIcon: {
    marginRight: theme.spacing(1.5),
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    color: theme.colors.headingText,
    fontSize: theme.fontSizes.sm,
  },
  selectedWorkerText: {
    color: theme.colors.primary,
  },
  workerSubtext: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  emptyStateCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  emptyStateText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  workerInfoCard: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(3),
  },
  workerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  workerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  workerAvatar: {
    borderWidth: 2,
    borderColor: theme.colors.borderColor,
  },
  workerHeaderTextContainer: {
    flex: 1,
  },
  workerHeaderName: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
  },
  workerHeaderSubtext: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing(0.5),
    paddingHorizontal: theme.spacing(1.5),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  monthNavButton: {
    padding: theme.spacing(0.5),
  },
  monthText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
    marginHorizontal: theme.spacing(1.5),
    minWidth: 120,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing(2),
  },
  summaryBox: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
    padding: theme.spacing(2),
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  summaryLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    textAlign: 'center',
  },
  sessionsCard: {
    flex: 1,
    overflow: 'hidden',
  },
  noSessionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
    gap: theme.spacing(2),
  },
  noSessionsText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  sessionsTableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    paddingVertical: theme.spacing(2),
  },
  tableHeaderText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionsScrollView: {
    flex: 1,
  },
  sessionsContent: {
    paddingBottom: theme.spacing(2),
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    paddingVertical: theme.spacing(2),
  },
  sessionDateCell: {
    width: 80,
    paddingHorizontal: theme.spacing(1),
    alignItems: 'center',
  },
  sessionDateText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
  },
  sessionDayText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  sessionTimeCell: {
    width: 80,
    paddingHorizontal: theme.spacing(1),
    alignItems: 'center',
  },
  sessionTimeText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  activeBadge: {
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  activeBadgeText: {
    color: theme.colors.success,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  sessionDurationCell: {
    width: 80,
    paddingHorizontal: theme.spacing(1),
    alignItems: 'center',
  },
  sessionDurationText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
  },
  sessionBreakCell: {
    width: 70,
    paddingHorizontal: theme.spacing(1),
    alignItems: 'center',
  },
  sessionBreakText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  sessionCorrectionCell: {
    width: 90,
    paddingHorizontal: theme.spacing(1),
    alignItems: 'center',
  },
  sessionCorrectionText: {
    fontSize: theme.fontSizes.sm,
  },
  sessionActionsCell: {
    width: 50,
    paddingHorizontal: theme.spacing(1),
    alignItems: 'center',
  },
  sessionActionButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    backgroundColor: theme.colors.pageBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WorkerTimesheetReport;
