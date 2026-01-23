import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Card } from "../../components/Card";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from '~/context/AuthContext';
import { useProjects } from '~/context/ProjectsContext';
import { useAssignments } from '~/context/AssignmentsContext'; // For commonLocations
import { fetchWorkSessionsByDateRange } from '../../services/workSessions';
import moment from 'moment';
import CustomMonthPicker from '../../components/time/CustomMonthPicker';
import { Button } from "../../components/Button";


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
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("Last 7 Days");
  const [workSessions, setWorkSessions] = useState<ProcessedSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customDateRange, setCustomDateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: moment().startOf('month').toDate(),
    endDate: moment().endOf('month').toDate(),
  });
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);


  const { user } = useSession()!;
  const { projects } = useProjects();
  const { commonLocations } = useAssignments();

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
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
        return;
    }

    if (startDate && endDate) {
      try {
        const fetchedSessions = await fetchWorkSessionsByDateRange(user.id, startDate.toISOString(), endDate.toISOString());

        const processed = fetchedSessions.map(session => {
          const start = moment(session.start_time);
          const end = session.end_time ? moment(session.end_time) : moment();
          const duration = moment.duration(end.diff(start));

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

          return {
            id: session.id,
            date: moment(session.start_time).format('YYYY-MM-DD'),
            projectName,
            projectAddress,
            duration: {
              hours: Math.floor(duration.asHours()),
              minutes: duration.minutes(),
            },
            totalHours: duration.asHours(),
          };
        });
        setWorkSessions(processed);
      } catch (err: any) {
        console.error("Error fetching work sessions:", err);
        setError("Failed to load work sessions.");
      }
    }
    setLoading(false);
  }, [selectedFilter, customDateRange, user?.id, projects, commonLocations]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dailySummaries = useMemo(() => {
    const sessionsByDate: { [date: string]: ProcessedSession[] } = workSessions.reduce((acc, session) => {
      const date = session.date;
      if (!acc[date]) {
        acc[date] = [];
      }
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
    }).sort((a, b) => moment(b.date).diff(moment(a.date))); // Sort by date descending
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
      <View style={styles.dailyHeader}>
        <View style={styles.dailyDateContainer}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.dailyDate}>{moment(item.date).format('MMMM D, YYYY')}</Text>
        </View>
        <Text style={styles.dailyTotalHours}>
          {item.totalDuration.hours}h {item.totalDuration.minutes}m
        </Text>
      </View>
      <View style={styles.dailyProjectsContainer}>
         <Ionicons name="briefcase-outline" size={16} color={theme.colors.bodyText} style={{marginRight: 5}}/>
        <Text style={styles.dailyProjectsText} numberOfLines={1}>
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
      <View style={[styles.container]}>
        <FlatList
          data={dailySummaries}
          keyExtractor={(item) => item.date}
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Dashboard</Text>
                {loading && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: theme.spacing(1) }} />}
              </View>
              
              <Card style={styles.summaryCard}>
                <View style={styles.summaryPeriodWrapper}>
                  <TouchableOpacity
                    onPress={() => selectedFilter === 'Custom' && setIsMonthPickerVisible(true)}
                    style={styles.summaryPeriodTouchable}
                  >
                    <Text style={styles.summaryPeriod}>{getSummaryPeriodText()}</Text>
                    {selectedFilter === 'Custom' && (
                      <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} style={styles.calendarIcon} />
                    )}
                  </TouchableOpacity>
                </View>
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : (
                  <View style={styles.summaryMetrics}>
                    <View style={styles.metric}>
                      <Text style={styles.metricValue}>{totalHours.toFixed(1)}</Text>
                      <Text style={styles.metricLabel}>Total Hours</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricValue}>{avgDailyHours.toFixed(1)}</Text>
                      <Text style={styles.metricLabel}>Avg. Daily</Text>
                    </View>
                  </View>
                )}
              </Card>


              <View style={styles.filterContainer}>
                <FlatList
                  data={FILTERS}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.filterButton, selectedFilter === item && styles.filterSelected]}
                      onPress={() => setSelectedFilter(item)}
                    >
                      <Text style={[styles.filterText, selectedFilter === item && styles.filterSelectedText]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item}
                />
              </View>

              <Text style={styles.sessionsTitle}>Work History</Text>
            </>
          }
          renderItem={renderDailySummary}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!loading ? <Card style={styles.emptyCard}><Text>No work sessions found for this period.</Text></Card> : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(1),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  summaryCard: {
    marginHorizontal: theme.spacing(2),
    marginTop: theme.spacing(2),
    padding: theme.spacing(2.5),
  },
  summaryPeriod: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  summaryPeriodWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  summaryPeriodTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    marginLeft: theme.spacing(1),
  },
  listContent: {
    paddingBottom: theme.spacing(2),
  },
  emptyCard: {
    marginHorizontal: theme.spacing(2),
    padding: theme.spacing(3),
    alignItems: 'center',
  },
  summaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing(2),
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  metricLabel: {
    fontSize: 14,
    color: theme.colors.bodyText,
    marginTop: theme.spacing(0.5),
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing(2),
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
  filterButton: {
    paddingVertical: theme.spacing(1),
    paddingHorizontal: theme.spacing(2),
    borderRadius: 20,
    backgroundColor: theme.colors.cardBackground,
    marginRight: theme.spacing(1),
  },
  filterSelected: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: theme.colors.bodyText,
  },
  filterSelectedText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sessionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    paddingHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: theme.spacing(2),
  },
  dailyCard: {
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(1.5),
    padding: theme.spacing(2),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.spacing(1),
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
  },
  dailyDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.headingText,
    marginLeft: theme.spacing(1),
  },
  dailyTotalHours: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  dailyProjectsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing(1),
  },
  dailyProjectsText: {
    fontSize: 14,
    color: theme.colors.bodyText,
    flex: 1,
  },
});