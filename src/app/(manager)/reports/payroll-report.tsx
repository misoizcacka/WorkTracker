import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '../../../components/Themed';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { Dropdown } from 'react-native-element-dropdown';
import { Button } from '../../../components/Button';
import { supabase } from '../../../utils/supabase';
import { useRouter } from 'expo-router'; // Import useRouter
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons

interface PayrollReportItem {
  worker_id: string;
  worker_name: string;
  total_work_hours: number;
  total_break_minutes: number;
  payable_hours: number;
}

const months = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => ({
  label: (currentYear - i).toString(),
  value: currentYear - i,
}));

const PayrollReport = () => {
  const router = useRouter(); // Initialize useRouter
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [reportData, setReportData] = useState<PayrollReportItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_monthly_payroll_report', {
        report_year: selectedYear,
        report_month: selectedMonth,
      });

      if (error) {
        console.error('Error fetching payroll report:', error);
        setReportData([]);
      } else {
        setReportData(data || []);
      }
      setLoading(false);
    };

    fetchReportData();
  }, [selectedMonth, selectedYear]);

  const totalWorkHours = reportData.reduce((sum: number, item) => sum + (item.total_work_hours || 0), 0);
  const totalBreakMinutes = reportData.reduce((sum: number, item) => sum + (item.total_break_minutes || 0), 0);
  const totalPayableHours = reportData.reduce((sum: number, item) => sum + (item.payable_hours || 0), 0);

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.headingText} />
        </TouchableOpacity>
        <View>
            <Text style={styles.pageTitle} fontType="bold">Payroll Report</Text>
            <Text style={styles.pageSubtitle}>Generate and review detailed payroll summaries for your workers.</Text>
        </View>
      </View>
      <ScrollView style={styles.containerNoPadding} contentContainerStyle={styles.scrollContentContainer}>
        {/* --- Filters --- */}
        <Card style={styles.filterCard}>
          <View style={styles.filterControls}>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={months}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select Month"
              value={selectedMonth}
              onChange={item => setSelectedMonth(item.value)}
            />
            <Dropdown
              style={[styles.dropdown, { marginLeft: theme.spacing(2) }]}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={years}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select Year"
              value={selectedYear}
              onChange={item => setSelectedYear(item.value)}
            />
          </View>
        </Card>

        {/* --- Payroll Table --- */}
        <Card style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colEmployee]} fontType="bold">Employee</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]} fontType="bold">Total Hours</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]} fontType="bold">Break (mins)</Text>
            <Text style={[styles.tableHeaderText, styles.colPayable]} fontType="bold">Payable Hours</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: theme.spacing(4) }} />
          ) : reportData.length === 0 ? (
            <Text style={styles.noDataText} fontType="regular">No data available for the selected period.</Text>
          ) : (
            reportData.map(item => (
              <View key={item.worker_id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colEmployee]} fontType="regular">{item.worker_name}</Text>
                <Text style={[styles.tableCell, styles.colNumeric]} fontType="regular">{item.total_work_hours.toFixed(2)}</Text>
                <Text style={[styles.tableCell, styles.colNumeric]} fontType="regular">{item.total_break_minutes}</Text>
                <Text style={[styles.tableCell, styles.colPayable]} fontType="regular">{item.payable_hours.toFixed(2)}</Text>
              </View>
            ))
          )}
        </Card>

        {/* --- Summary Card --- */}
        <Card style={styles.tableCard}>
          <Text style={styles.cardTitle} fontType="bold">Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel} fontType="regular">Total Work Hours</Text>
            <Text style={styles.summaryValue} fontType="bold">{totalWorkHours.toFixed(2)} hrs</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel} fontType="regular">Total Break Minutes</Text>
            <Text style={styles.summaryValue} fontType="bold">{totalBreakMinutes} mins</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel} fontType="regular">Total Payable Hours</Text>
            <Text style={[styles.summaryValue, styles.totalPayableValue]} fontType="bold">{totalPayableHours.toFixed(2)} hrs</Text>
          </View>
        </Card>

        {/* --- Export Buttons --- */}
        <View style={styles.exportContainer}>
          <Button style={[styles.exportButton, { backgroundColor: theme.colors.success }]}><Text style={styles.exportButtonText} fontType="bold">Export as Excel</Text></Button>
          <Button style={[styles.exportButton, { backgroundColor: theme.colors.danger }]}><Text style={styles.exportButtonText} fontType="bold">Export as PDF</Text></Button>
          <Button style={[styles.exportButton, { backgroundColor: theme.colors.bodyText }]}><Text style={styles.exportButtonText} fontType="bold">Export as CSV</Text></Button>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  containerNoPadding: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  scrollContentContainer: {
    padding: theme.spacing(3),
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
  title: { // This style might be unused now, but keeping it for now if other components use it
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(3),
  },
  cardTitle: {
    fontSize: theme.fontSizes.lg,
    marginBottom: theme.spacing(2),
    color: theme.colors.headingText,
  },
  filterCard: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  filterControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdown: {
    flex: 1,
    height: 48,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: 15,
    backgroundColor: theme.colors.pageBackground,
  },
  placeholderStyle: { fontSize: theme.fontSizes.md, color: theme.colors.bodyText },
  selectedTextStyle: { fontSize: theme.fontSizes.md, color: theme.colors.headingText },
  tableCard: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.borderColor,
    paddingBottom: theme.spacing(1),
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    paddingVertical: theme.spacing(1.5),
    alignItems: 'center'
  },
  tableHeaderText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
  },
  tableCell: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  noDataText: {
    textAlign: 'center',
    paddingVertical: theme.spacing(4),
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  colEmployee: {
    flex: 3,
  },
  colNumeric: {
    flex: 2,
    textAlign: 'right',
  },
  colPayable: {
    flex: 2,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  summaryCard: { // This seems to be new or duplicated. It is used as tableCard.
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  summaryLabel: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  summaryValue: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  totalPayableValue: {
    color: theme.colors.success,
    fontSize: theme.fontSizes.lg,
  },
  exportContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  exportButton: {
    marginLeft: theme.spacing(1),
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  exportButtonText: {
    color: 'white',
  }
});