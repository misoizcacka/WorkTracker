import React, { useState, useEffect, useMemo, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, ActivityIndicator, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { LineChart } from 'react-native-chart-kit';

import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { EmployeesContext, EmployeesContextType } from '../../../context/EmployeesContext';
import { Employee } from '../../../types';
import CrossPlatformDatePicker from '../../../components/CrossPlatformDatePicker';
import { supabase } from '../../../utils/supabase';
import { useSession } from '~/context/AuthContext';


interface DailyHoursReportEntry {
    report_date: string; // YYYY-MM-DD
    worker_id: string;
    worker_full_name: string;
    total_hours_worked: number;
}

const EmployeeSummaryReport = () => {
    const { user } = useSession();
    const { employees } = useContext(EmployeesContext) as EmployeesContextType;
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [selectedMonth, setSelectedMonth] = useState(moment().startOf('month').toDate());
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [reportData, setReportData] = useState<DailyHoursReportEntry[]>([]);
    const [loading, setLoading] = useState(false);

    // Filter out managers, guests, and the current user from the employee list
    const availableWorkers = useMemo(() => {
        return employees.filter(emp => 
            emp.role === 'worker' && emp.id !== user?.id
        );
    }, [employees, user?.id]);


    // Effect to fetch report data
    useEffect(() => {
        const fetchReport = async () => {
            if (selectedWorkerIds.length === 0) {
                setReportData([]);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase.rpc('get_workers_monthly_daily_summary', {
                p_worker_ids: selectedWorkerIds,
                p_report_year: moment(selectedMonth).year(),
                p_report_month: moment(selectedMonth).month() + 1, // month() is 0-indexed
            });

            if (error) {
                console.error('Error fetching monthly daily summary:', error);
                setReportData([]);
            } else {
                setReportData(data || []);
            }
            setLoading(false);
        };

        fetchReport();
    }, [selectedWorkerIds, selectedMonth]);


    // Toggle worker selection
    const handleWorkerSelect = (workerId: string) => {
        setSelectedWorkerIds(prev =>
            prev.includes(workerId)
                ? prev.filter(id => id !== workerId)
                : [...prev, workerId]
        );
    };

    // Prepare chart data
    const chartData = useMemo(() => {
        const daysInMonth = moment(selectedMonth).daysInMonth();
        const labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString()); // Day numbers 1 to 31

        const datasets = selectedWorkerIds.map(workerId => {
            const worker = availableWorkers.find(emp => emp.id === workerId);
            const dataForWorker = Array(daysInMonth).fill(0); // Initialize with 0 hours for each day

            reportData
                .filter(entry => entry.worker_id === workerId)
                .forEach(entry => {
                    const day = moment(entry.report_date).date(); // Get day of month (1-indexed)
                    dataForWorker[day - 1] = entry.total_hours_worked;
                });
            
            return {
                data: dataForWorker,
                color: (opacity = 1) => { // Random color for each worker
                    if (!worker) return `rgba(0,0,0,${opacity})`;
                    // A simple hash function to get a consistent color for each worker
                    let hash = 0;
                    for (let i = 0; i < worker.id.length; i++) {
                        hash = worker.id.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    const color = `hsl(${hash % 360}, 70%, 50%)`; // HSL for good color distribution
                    return color.replace(')', `,${opacity})`).replace('hsl', 'hsla');
                },
                name: worker?.full_name || 'Unknown',
            };
        });

        return {
            labels,
            datasets,
        };
    }, [reportData, selectedWorkerIds, selectedMonth, availableWorkers]);

  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>Employee Work Hours Report</Text>

        <View style={isLargeScreen ? styles.largeScreenLayout : styles.smallScreenLayout}>
          {/* Left Column: Month Selector and Worker List */}
          <View style={styles.leftPanel}>
            <Card style={styles.monthPickerCard}>
              <Text style={styles.panelTitle}>Select Month</Text>
              <CrossPlatformDatePicker
                date={selectedMonth}
                onDateChange={(date) => setSelectedMonth(moment(date).startOf('month').toDate())}
                mode="month"
              />
            </Card>

            <Card style={styles.workerListCard}>
              <Text style={styles.panelTitle}>Select Workers</Text>
              <FlatList
                data={availableWorkers}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.workerListItem}
                    onPress={() => handleWorkerSelect(item.id)}
                  >
                    <Ionicons
                      name={selectedWorkerIds.includes(item.id) ? "checkbox-outline" : "square-outline"}
                      size={24}
                      color={theme.colors.primary}
                    />
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                    ) : (
                      <Ionicons name="person" size={36} color={theme.colors.bodyText} style={styles.avatarPlaceholder} />
                    )}
                    <Text style={styles.workerName}>{item.full_name}</Text>
                  </TouchableOpacity>
                )}
              />
            </Card>
          </View>

          {/* Right Column: Work Hours Graph */}
          <View style={styles.rightPanel}>
            <Card style={styles.chartCard}>
              <Text style={styles.panelTitle}>Monthly Work Hours</Text>
              {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.chartLoading} />
              ) : selectedWorkerIds.length === 0 ? (
                <Text style={styles.noDataText}>Select workers to view their monthly work hours.</Text>
              ) : reportData.length === 0 ? (
                <Text style={styles.noDataText}>No work hours data available for the selected workers and month.</Text>
              ) : (
                <LineChart
                  data={chartData}
                  width={isLargeScreen ? width * 0.6 - theme.spacing(6) : width - theme.spacing(6)} // Adjust chart width
                  height={300}
                  chartConfig={{
                    backgroundColor: theme.colors.cardBackground,
                    backgroundGradientFrom: theme.colors.cardBackground,
                    backgroundGradientTo: theme.colors.cardBackground,
                    decimalPlaces: 1, // optional, defaults to 2dp
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // default color for labels
                    labelColor: (opacity = 1) => theme.colors.bodyText,
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: theme.colors.primary,
                    },
                    propsForBackgroundLines: {
                        strokeDasharray: '0', // solid lines
                        stroke: theme.colors.borderColor,
                    },
                    propsForVerticalLabels: {
                        fontSize: theme.fontSizes.xs,
                    },
                    propsForHorizontalLabels: {
                        fontSize: theme.fontSizes.xs,
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              )}
            </Card>
          </View>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.pageBackground },
  scrollContentContainer: { padding: theme.spacing(3) },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.headingText, marginBottom: theme.spacing(3) },
  
  largeScreenLayout: { flexDirection: 'row', justifyContent: 'space-between' },
  smallScreenLayout: { flexDirection: 'column' },

  leftPanel: { flex: 1, marginRight: theme.spacing(3) },
  rightPanel: { flex: 2 }, // Graph takes more space

  panelTitle: { fontSize: 20, fontWeight: '600', color: theme.colors.headingText, marginBottom: theme.spacing(2) },
  
  monthPickerCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
  workerListCard: { flex: 1, padding: theme.spacing(2), minHeight: 300 }, // Added minHeight for some content
  workerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderColor,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: theme.spacing(1.5), marginLeft: theme.spacing(1) },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    marginRight: theme.spacing(1.5),
    marginLeft: theme.spacing(1),
    textAlign: 'center',
    lineHeight: 36,
  },
  workerName: { flex: 1, marginLeft: theme.spacing(1), color: theme.colors.bodyText, fontSize: theme.fontSizes.md },

  chartCard: { padding: theme.spacing(2), minHeight: 400 },
  chartLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    // Adjust background for chart based on theme
    backgroundColor: theme.colors.cardBackground,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: theme.spacing(4),
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },

  // Removed old filter and summary styles
  filterCard: { display: 'none' }, // Hide old filter
  summaryCard: { display: 'none' }, // Hide old summary
  tableCard: { display: 'none' }, // Hide old table

  // Keep these for now, may remove later if not relevant
  summaryItem: {},
  summaryLabel: {},
  summaryValue: {},
  summarySeparator: {},
  tableHeader: {},
  tableRow: {},
  tableHeaderText: {},
  tableCell: {},
  tableCellText: {},
  employeeName: {},
  projectText: {},
  colEmployee: {},
  colNumeric: {},
  colTotal: {},
  totalHoursValue: {},
  otValue: {},
});

