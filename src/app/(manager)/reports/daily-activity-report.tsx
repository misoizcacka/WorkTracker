import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { Text } from '../../../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { useRouter } from 'expo-router';

import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import CrossPlatformDatePicker from '../../../components/CrossPlatformDatePicker';
import { theme } from '../../../theme';
import { supabase } from '../../../utils/supabase';
import { useSession } from '~/context/AuthContext';
import { EmployeesContext, EmployeesContextType } from '../../../context/EmployeesContext';

interface DailyActivityEntry {
  worker_id: string;
  worker_full_name: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string or null
  total_hours_worked: number;
}

const DailyActivityReport = () => {
  const router = useRouter();
  const { user } = useSession();
  const { employees } = useContext(EmployeesContext) as EmployeesContextType; // To get employee avatars, etc.

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportData, setReportData] = useState<DailyActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_workers_with_sessions_for_date', {
        report_date: moment(selectedDate).format('YYYY-MM-DD'),
      });

      if (error) {
        console.error('Error fetching daily activity report:', error);
        setReportData([]);
      } else {
        // Filter out managers and guests, and format data
        const filteredData = (data || []).filter((entry: DailyActivityEntry) => {
          const employee = employees.find(emp => emp.id === entry.worker_id);
          return employee && employee.role === 'worker';
        });
        setReportData(filteredData);
      }
      setLoading(false);
    };

    fetchReport();
  }, [selectedDate, employees]);

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.headingText} />
        </TouchableOpacity>
        <View>
            <Text style={styles.pageTitle} fontType="bold">Daily Activity Report</Text>
            <Text style={styles.pageSubtitle}>View a summary of worker activities for a selected day.</Text>
        </View>
      </View>
      <View style={styles.containerNoPadding}>
        <Card style={styles.filterCard}>
          <Text style={styles.filterLabel} fontType="medium">Select Date:</Text>
          <CrossPlatformDatePicker
            date={selectedDate}
            onDateChange={setSelectedDate}
            mode="date"
          />
        </Card>

        <Card style={styles.listCard}>
          <Text style={styles.cardTitle} fontType="bold">Active Employees</Text>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loadingIndicator} />
          ) : reportData.length === 0 ? (
            <Text style={styles.noDataText} fontType="regular">No worker activity for {moment(selectedDate).format('YYYY-MM-DD')}.</Text>
          ) : (
            <FlatList
              data={reportData}
              keyExtractor={(item) => item.worker_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.workerActivityItem}
                  onPress={() => router.push({
                    pathname: `/reports/daily-detailed-report/${item.worker_id}`,
                    params: { startDate: moment(selectedDate).startOf('day').toISOString(), endDate: moment(selectedDate).endOf('day').toISOString() }
                  })}
                >
                  <View>
                    <Text style={styles.workerName} fontType="bold">{item.worker_full_name}</Text>
                    <Text style={styles.detailText} fontType="regular">Start: {moment(item.start_time).format('HH:mm')}</Text>
                    <Text style={styles.detailText} fontType="regular">End: {item.end_time ? moment(item.end_time).format('HH:mm') : 'N/A'}</Text>
                    <Text style={styles.detailText} fontType="regular">Total Hours: {(item.total_hours_worked ?? 0).toFixed(2)}</Text>
                    <Text style={styles.detailText} fontType="regular">Projects: TODO</Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={24} color={theme.colors.bodyText} />
                </TouchableOpacity>
              )}
            />
          )}
        </Card>
      </View>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  containerNoPadding: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
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
  filterCard: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  filterLabel: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(1),
  },
  listCard: {
    padding: theme.spacing(2),
  },
  cardTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  loadingIndicator: {
    marginVertical: theme.spacing(4),
  },
  noDataText: {
    textAlign: 'center',
    paddingVertical: theme.spacing(4),
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  workerActivityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  workerName: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
  },
  detailText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
});

export default DailyActivityReport;
