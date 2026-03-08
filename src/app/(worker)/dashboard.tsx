import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { Text } from "../../components/Themed";
import { Card } from "../../components/Card";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from '~/context/AuthContext';
import { useProjects } from '~/context/ProjectsContext';
import { useAssignments } from '~/context/AssignmentsContext';
import { fetchWorkSessionsByDateRange } from '../../services/workSessions';
import moment from 'moment';
import CustomMonthPicker from '../../components/time/CustomMonthPicker';

const FILTERS = ["Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "Custom"] as const;
type FilterType = (typeof FILTERS)[number];

interface ProcessedSession {
  id: string;
  date: string;
  projectName: string;
  projectAddress: string;
  duration: {
    hours: number;
    minutes: number;
  };
  totalHours: number;
}

interface DailySummary {
  date: string;
  totalDuration: {
    hours: number;
    minutes: number;
  };
  projects: string[];
}

export default function WorkerDashboardScreen() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("Last 7 Days");
  const [workSessions, setWorkSessions] = useState<ProcessedSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customDateRange, setCustomDateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: moment().startOf('month').toDate(),
    endDate: moment().endOf('month').toDate(),
  });
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);

  const { user, userCompanyName } = useSession()!;
  const { projects } = useProjects();
  const { commonLocations } = useAssignments();

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;

    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);
    
    setError(null);
    let startDate: moment.Moment;
    let endDate: moment.Moment;

    const today = moment();

    switch (selectedFilter) {
      case "Yesterday":
        startDate = today.clone().subtract(1, 'days').startOf('day');
        endDate = today.clone().subtract(1, 'days').endOf('day');
        break;
      case "Last 7 Days":
        startDate = today.clone().subtract(6, 'days').startOf('day');
        endDate = today.clone().endOf('day');
        break;
      case "Last 30 Days":
        startDate = today.clone().subtract(29, 'days').startOf('day');
        endDate = today.clone().endOf('day');
        break;
      case "This Month":
        startDate = today.clone().startOf('month');
        endDate = today.clone().endOf('month');
        break;
      case "Custom":
        startDate = moment(customDateRange.startDate);
        endDate = moment(customDateRange.endDate);
        break;
      default:
        setWorkSessions([]);
        setLoading(false);
        setIsRefreshing(false);
        return;
    }

    try {
      const fetchedSessions = await fetchWorkSessionsByDateRange(user.id, startDate.toISOString(), endDate.toISOString());

      const processed: ProcessedSession[] = [];
      
      fetchedSessions.forEach(session => {
        let currentStart = moment(session.start_time);
        const finalEnd = session.end_time ? moment(session.end_time) : moment();
        
        // Find project info once for the session
        const assignmentRef = session.worker_assignments;
        let projectName = "Unknown";
        let projectAddress = "N/A";

        if (assignmentRef) {
          if (assignmentRef.ref_type === 'project') {
            const project = projects.find(p => p.id === assignmentRef.ref_id);
            if (project) {
              projectName = project.name;
              projectAddress = project.address;
            }
          } else if (assignmentRef.ref_type === 'common_location') {
            const location = commonLocations.find(l => l.id === assignmentRef.ref_id);
            if (location) {
              projectName = location.name;
              projectAddress = ""; 
            }
          }
        }

        // Split session into daily parts
        while (currentStart.isBefore(finalEnd)) {
          const eod = currentStart.clone().endOf('day');
          const currentPartEnd = moment.min(eod, finalEnd);
          const duration = moment.duration(currentPartEnd.diff(currentStart));
          
          if (duration.asMinutes() > 0) {
            processed.push({
              id: `${session.id}-${currentStart.format('YYYY-MM-DD')}`,
              date: currentStart.format('YYYY-MM-DD'),
              projectName,
              projectAddress,
              duration: {
                hours: Math.floor(duration.asHours()),
                minutes: duration.minutes(),
              },
              totalHours: duration.asHours(),
            });
          }
          
          currentStart = eod.clone().add(1, 'ms').startOf('day');
          if (currentStart.isSameOrAfter(finalEnd)) break;
        }
      });
      
      setWorkSessions(processed);
    } catch (err: any) {
      console.error("Error fetching work sessions:", err);
      setError("Failed to load work sessions.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedFilter, customDateRange, user?.id, projects, commonLocations]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => fetchData(true);

  const dailySummaries = useMemo(() => {
    const sessionsByDate: { [date: string]: ProcessedSession[] } = workSessions.reduce((acc, session) => {
      const date = session.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(session);
      return acc;
    }, {} as { [date: string]: ProcessedSession[] });

    return Object.keys(sessionsByDate).map(date => {
      const sessions = sessionsByDate[date];
      const totalMilliseconds = sessions.reduce((sum, s) => sum + moment.duration({ hours: s.duration.hours, minutes: s.duration.minutes }).asMilliseconds(), 0);
      const totalDuration = moment.duration(totalMilliseconds);
      const projects = [...new Set(sessions.map(s => s.projectName))];

      return {
        date,
        totalDuration: {
          hours: Math.floor(totalDuration.asHours()),
          minutes: totalDuration.minutes()
        },
        projects
      };
    }).sort((a, b) => moment(b.date).diff(moment(a.date)));
  }, [workSessions]);

  const totalHours = useMemo(() => {
    return dailySummaries.reduce((sum, day) => sum + day.totalDuration.hours + day.totalDuration.minutes / 60, 0);
  }, [dailySummaries]);

  const avgDailyHours = useMemo(() => {
    if (dailySummaries.length === 0) return 0;
    return totalHours / dailySummaries.length;
  }, [dailySummaries, totalHours]);

  const renderDailySummary = ({ item }: { item: DailySummary }) => (
    <Card style={styles.dailyCard}>
      <View style={styles.dailyCardHeader}>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.dateText} fontType="bold">{moment(item.date).format('MMM D, YYYY')}</Text>
        </View>
        <Text style={styles.dailyHours} fontType="bold">
          {item.totalDuration.hours}h {item.totalDuration.minutes}m
        </Text>
      </View>
      
      <View style={styles.projectsRow}>
        <Ionicons name="business-outline" size={16} color={theme.colors.disabledText} />
        <Text style={styles.projectsText} numberOfLines={1}>
          {item.projects.join(', ')}
        </Text>
      </View>
    </Card>
  );

  const getSummaryPeriodText = () => {
    if (selectedFilter === 'Custom') {
      return moment(customDateRange.startDate).format('MMMM YYYY');
    }
    return selectedFilter;
  }

  const handleMonthSelect = (startDate: Date, endDate: Date) => {
    setCustomDateRange({ startDate, endDate });
  }

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <FlatList
          data={dailySummaries}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <View style={styles.pageHeader}>
                <Text style={styles.title} fontType="bold">Personal Dashboard</Text>
                <Text style={styles.subtitle}>{userCompanyName || 'Activity Overview'}</Text>
              </View>

              {/* Summary Stats Card */}
              <Card style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <TouchableOpacity
                    onPress={() => selectedFilter === 'Custom' && setIsMonthPickerVisible(true)}
                    style={styles.periodPicker}
                    disabled={selectedFilter !== 'Custom'}
                  >
                    <Text style={styles.periodText} fontType="bold">{getSummaryPeriodText()}</Text>
                    {selectedFilter === 'Custom' && (
                      <Ionicons name="chevron-down" size={16} color={theme.colors.primary} style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                  <Ionicons name="stats-chart" size={20} color={theme.colors.primaryMuted} />
                </View>

                {error ? (
                  <Text style={styles.errorText} fontType="medium">{error}</Text>
                ) : (
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue} fontType="bold">{totalHours.toFixed(1)}h</Text>
                      <Text style={styles.statLabel}>Total Hours</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue} fontType="bold">{avgDailyHours.toFixed(1)}h</Text>
                      <Text style={styles.statLabel}>Avg. Daily</Text>
                    </View>
                  </View>
                )}
              </Card>

              {/* Filters Scroll */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContent}
              >
                {FILTERS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.filterPill, selectedFilter === item && styles.filterPillActive]}
                    onPress={() => setSelectedFilter(item)}
                  >
                    <Text style={[styles.filterLabel, selectedFilter === item && styles.filterLabelActive]} fontType="medium">
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} fontType="bold">Work History</Text>
                {loading && <ActivityIndicator size="small" color={theme.colors.primary} />}
              </View>
            </View>
          }
          renderItem={renderDailySummary}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={theme.colors.borderColor} />
                <Text style={styles.emptyText} fontType="medium">No history found for this period.</Text>
              </View>
            ) : null
          }
        />

        <CustomMonthPicker 
          isVisible={isMonthPickerVisible}
          onClose={() => setIsMonthPickerVisible(false)}
          initialDate={customDateRange.startDate}
          onMonthSelect={handleMonthSelect}
        />
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  listContent: {
    paddingBottom: theme.spacing(4),
  },
  headerContainer: {
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(3),
  },
  pageHeader: {
    marginBottom: theme.spacing(3),
  },
  title: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
  },
  subtitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  periodPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.5),
    borderRadius: theme.radius.pill,
  },
  periodText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    color: theme.colors.headingText,
  },
  statLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.borderColor,
  },
  filterScroll: {
    marginBottom: theme.spacing(3),
  },
  filterContent: {
    gap: theme.spacing(1),
  },
  filterPill: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  filterLabelActive: {
    color: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
  },
  dailyCard: {
    marginHorizontal: theme.spacing(3),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2.5),
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  dailyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  dailyHours: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.primary,
  },
  projectsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: theme.spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  projectsText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: theme.colors.disabledText,
    marginTop: 16,
    fontSize: theme.fontSizes.md,
  },
  errorText: {
    color: theme.colors.danger,
    textAlign: 'center',
  }
});
