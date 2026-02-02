import React, { useState, useEffect, useMemo, useContext } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, ActivityIndicator, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text } from '../../../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { useRouter } from 'expo-router';

import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { EmployeesContext, EmployeesContextType } from '../../../context/EmployeesContext';
import { Employee } from '../../../types';
import CrossPlatformDatePicker from '../../../components/CrossPlatformDatePicker';
import { supabase } from '../../../utils/supabase';
import { useSession } from '~/context/AuthContext';


interface MonthlyPayrollReportEntry {
    worker_id: string;
    worker_full_name: string;
    total_work_hours: number;
    total_break_minutes: number;
    payable_hours: number;
}

const EmployeeHoursReport = () => {
    const router = useRouter();
    const { user } = useSession();
    const { employees } = useContext(EmployeesContext) as EmployeesContextType;
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [startDate, setStartDate] = useState(moment().startOf('month').toDate());
    const [endDate, setEndDate] = useState(moment().endOf('month').toDate());
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [reportData, setReportData] = useState<MonthlyPayrollReportEntry[]>([]);
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
            if (selectedWorkerIds.length === 0 || !startDate || !endDate) {
                setReportData([]);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase.rpc('get_monthly_payroll_report', {
                p_worker_ids: selectedWorkerIds,
                p_start_date: moment(startDate).format('YYYY-MM-DD'),
                p_end_date: moment(endDate).format('YYYY-MM-DD'),
            });

            if (error) {
                console.error('Error fetching monthly payroll report:', error);
                setReportData([]);
            } else {
                setReportData(data || []);
            }
            setLoading(false);
        };

        fetchReport();
    }, [selectedWorkerIds, startDate, endDate]);


    // Toggle worker selection
    const handleWorkerSelect = (workerId: string) => {
        setSelectedWorkerIds(prev =>
            prev.includes(workerId)
                ? prev.filter(id => id !== workerId)
                : [...prev, workerId]
        );
    };



  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.headingText} />
        </TouchableOpacity>
        <View>
            <Text style={styles.pageTitle} fontType="bold">Employee Hours Report</Text>
            <Text style={styles.pageSubtitle}>View and analyze employee work hours for a selected period.</Text>
        </View>
      </View>
      <ScrollView style={styles.containerNoPadding} contentContainerStyle={styles.scrollContentContainer}>
        <View style={isLargeScreen ? styles.largeScreenLayout : styles.smallScreenLayout}>
          {/* Left Column: Month Selector and Worker List */}
          <View style={styles.leftPanel}>
            <Card style={styles.monthPickerCard}>
              <Text style={styles.panelTitle} fontType="bold">Select Date Range</Text>
              <View style={styles.datePickerRow}>
                <CrossPlatformDatePicker
                  date={startDate}
                  onDateChange={setStartDate}
                  mode="date"
                />
                <Text style={styles.dateRangeSeparator} fontType="regular">-</Text>
                <CrossPlatformDatePicker
                  date={endDate}
                  onDateChange={setEndDate}
                  mode="date"
                />
              </View>
            </Card>

            <Card style={styles.workerListCard}>
              <Text style={styles.panelTitle} fontType="bold">Select Workers</Text>
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
                    <Text style={styles.workerName} fontType="regular">{item.full_name}</Text>
                  </TouchableOpacity>
                )}
              />
            </Card>
          </View>

          {/* Right Column: Work Hours Graph */}
          <View style={styles.rightPanel}>
            <Card style={styles.chartCard}>
              <Text style={styles.panelTitle} fontType="bold">Employee Work Summaries</Text>
              {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.chartLoading} />
              ) : selectedWorkerIds.length === 0 ? (
                <Text style={styles.noDataText} fontType="regular">Select workers to view their work summaries.</Text>
              ) : reportData.length === 0 ? (
                <Text style={styles.noDataText} fontType="regular">No work hours data available for the selected workers and date range.</Text>
              ) : (
                <View>
                  {reportData.map((entry) => (
                    <TouchableOpacity
                      key={entry.worker_id}
                      style={styles.summaryItem}
                      onPress={() => router.push({
                        pathname: `/reports/daily-detailed-report/${entry.worker_id}`,
                        params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
                      })}
                    >
                      <Text style={styles.summaryItemTitle} fontType="bold">{entry.worker_full_name}</Text>
                      <Text style={styles.summaryItemText} fontType="regular">Total Worked Hours: {entry.total_work_hours.toFixed(2)}</Text>
                      <Text style={styles.summaryItemText} fontType="regular">Total Break Minutes: {entry.total_break_minutes}</Text>
                      <Text style={styles.summaryItemText} fontType="regular">Average Hours/Day: TODO</Text>
                      <Text style={styles.summaryItemText} fontType="regular">Projects Worked On: TODO</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>
          </View>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  containerNoPadding: { flex: 1, backgroundColor: theme.colors.pageBackground },
  container: { flex: 1, backgroundColor: theme.colors.pageBackground },
  scrollContentContainer: { padding: theme.spacing(3) },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.background,
  },
  backButton: {
    marginRight: theme.spacing(2),
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
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.headingText, marginBottom: theme.spacing(3) },
  
  largeScreenLayout: { flexDirection: 'row', justifyContent: 'space-between' },
  smallScreenLayout: { flexDirection: 'column' },

  leftPanel: { flex: 1, marginRight: theme.spacing(3) },
  rightPanel: { flex: 2 }, // Graph takes more space

  panelTitle: { fontSize: theme.fontSizes.lg, color: theme.colors.headingText, marginBottom: theme.spacing(2) },
  
  monthPickerCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  dateRangeSeparator: {
    color: theme.colors.bodyText,
    marginHorizontal: theme.spacing(1),
    fontSize: theme.fontSizes.md,
  },
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
  noDataText: {
    textAlign: 'center',
    marginTop: theme.spacing(4),
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  summaryItem: {
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing(2),
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  summaryItemTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  summaryItemText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(0.5),
  },
});

export default EmployeeHoursReport;