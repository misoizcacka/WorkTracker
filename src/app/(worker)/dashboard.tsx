import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, TextInput, ActivityIndicator } from "react-native";
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
import CrossPlatformDatePicker from '../../components/CrossPlatformDatePicker';

const FILTERS = ["Last 7 Days", "This Month", "Previous Month", "Custom"] as const;

interface ProcessedSession {
  id: string;
  date: string;
  projectName: string;
  projectAddress: string;
  hours: number;
}

export default function WorkerDashboardScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedFilter, setSelectedFilter] = useState<"Last 7 Days" | "This Month" | "Previous Month" | "Custom">("This Month");
  const [workSessions, setWorkSessions] = useState<ProcessedSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  const { user } = useSession()!;
  const { projects } = useProjects();
  const { commonLocations } = useAssignments();

  useEffect(() => {
    if (Platform.OS === 'web') {
      // For web, CustomInput needs to be defined within the render scope or passed as a prop
      // to access theme. For now, this is a placeholder.
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);
    let startDate: moment.Moment | null = null;
    let endDate: moment.Moment | null = null;

    const today = moment();

    switch (selectedFilter) {
      case "Last 7 Days":
        startDate = today.clone().subtract(6, 'days').startOf('day');
        endDate = today.clone().endOf('day');
        break;
      case "This Month":
        startDate = today.clone().startOf('month');
        endDate = today.clone().endOf('month');
        break;
      case "Previous Month":
        startDate = today.clone().subtract(1, 'month').startOf('month');
        endDate = today.clone().subtract(1, 'month').endOf('month');
        break;
      case "Custom":
        if (customStartDate && customEndDate) {
          startDate = moment(customStartDate).startOf('day');
          endDate = moment(customEndDate).endOf('day');
        }
        break;
    }

    if (startDate && endDate) {
      try {
        const fetchedSessions = await fetchWorkSessionsByDateRange(user.id, startDate.toISOString(), endDate.toISOString());

        const processed = fetchedSessions.map(session => {
          // Calculate duration in hours
          const start = moment(session.start_time);
          const end = session.end_time ? moment(session.end_time) : moment(); // If session is active, use current time
          const hours = moment.duration(end.diff(start)).asHours();

          // Find associated project or location details
          const assignmentRef = session.worker_assignments; // Access the joined data
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
                // No address for common locations by default, could add if needed
                projectAddress = "";
              }
            }
          }

          return {
            id: session.id,
            date: moment(session.start_time).format('YYYY-MM-DD'),
            projectName,
            projectAddress,
            hours,
          };
        });
        setWorkSessions(processed);
      } catch (err: any) {
        console.error("Error fetching work sessions:", err);
        setError("Failed to load work sessions.");
      }
    } else {
      setWorkSessions([]);
    }
    setLoading(false);
  }, [selectedFilter, customStartDate, customEndDate, user?.id, projects, commonLocations]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalHours = useMemo(() => {
    return workSessions.reduce((sum, session) => sum + session.hours, 0);
  }, [workSessions]);

  const avgDailyHours = useMemo(() => {
    if (workSessions.length === 0) return 0;
    const uniqueDates = new Set(workSessions.map(session => session.date)).size;
    return totalHours / uniqueDates;
  }, [workSessions, totalHours]);

  const renderSession = ({ item }: { item: ProcessedSession }) => (
    <Card style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionDate}>{item.date}</Text>
      </View>
      <Text style={styles.sessionProject}>{item.projectName}</Text>
      <Text style={styles.sessionAddress}>{item.projectAddress}</Text>
    </Card>
  );

  const CustomDatePickerComponent = () => (
    <View style={styles.datePickerContainer}>
      <View style={styles.dateInputGroup}>
        <Text style={styles.datePickerLabel}>Select Month</Text>
        <CrossPlatformDatePicker
          date={customStartDate || new Date()}
          onDateChange={(newDate) => {
            setCustomStartDate(moment(newDate).startOf('month').toDate());
            setCustomEndDate(moment(newDate).endOf('month').toDate());
          }}
          mode="month"
        />
      </View>
      <TouchableOpacity style={styles.datePickerButton} onPress={fetchData}>
        <Text style={styles.datePickerButtonText}>Apply</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <AnimatedScreen>
      <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
        <FlatList
          data={workSessions}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Dashboard</Text>
                {loading && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: theme.spacing(1) }} />}
              </View>
              
              <Card style={styles.summaryCard}>
                <Text style={styles.summaryPeriod}>{selectedFilter}</Text>
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

              {selectedFilter === 'Custom' && <CustomDatePickerComponent />}

              <Text style={styles.sessionsTitle}>Work History</Text>
            </>
          }
          renderItem={renderSession}
          contentContainerStyle={styles.listContent}
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
    marginBottom: theme.spacing(2),
  },
  summaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
    marginTop: 4,
  },
  errorText: {
    color: theme.colors.danger,
    textAlign: 'center',
    fontSize: 16,
  },
  filterContainer: {
    paddingVertical: theme.spacing(2),
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    marginHorizontal: 5,
  },
  filterSelected: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.headingText,
  },
  filterSelectedText: {
    color: theme.colors.cardBackground,
  },
  datePickerContainer: {
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  dateInputGroup: {
    marginBottom: theme.spacing(1.5),
  },
  datePickerLabel: {
    fontSize: 14,
    color: theme.colors.bodyText,
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: theme.spacing(1.5),
    fontSize: 16,
  },
  datePickerButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: theme.colors.cardBackground,
    fontWeight: 'bold',
    fontSize: 16,
  },
  sessionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  listContent: {
    paddingBottom: theme.spacing(2),
  },
  sessionCard: {
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(1.5),
    padding: theme.spacing(2),
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.headingText,
  },
  sessionHours: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  sessionProject: {
    fontSize: 15,
    color: theme.colors.headingText,
    marginVertical: 4,
  },
  sessionAddress: {
    fontSize: 13,
    color: theme.colors.bodyText,
  },
});