import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { Dropdown } from 'react-native-element-dropdown';
import { Button } from '../../../components/Button';
import { supabase } from '../../../utils/supabase';

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

  const totalWorkHours = reportData.reduce((sum, item) => sum + (item.total_work_hours || 0), 0);
  const totalBreakMinutes = reportData.reduce((sum, item) => sum + (item.total_break_minutes || 0), 0);
  const totalPayableHours = reportData.reduce((sum, item) => sum + (item.payable_hours || 0), 0);

  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>Monthly Payroll Report</Text>

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
            <Text style={[styles.tableHeaderText, styles.colEmployee]}>Employee</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]}>Total Hours</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]}>Break (mins)</Text>
            <Text style={[styles.tableHeaderText, styles.colPayable]}>Payable Hours</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: theme.spacing(4) }} />
          ) : reportData.length === 0 ? (
            <Text style={styles.noDataText}>No data available for the selected period.</Text>
          ) : (
            reportData.map(item => (
              <View key={item.worker_id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colEmployee]}>{item.worker_name}</Text>
                <Text style={[styles.tableCell, styles.colNumeric]}>{item.total_work_hours.toFixed(2)}</Text>
                <Text style={[styles.tableCell, styles.colNumeric]}>{item.total_break_minutes}</Text>
                <Text style={[styles.tableCell, styles.colPayable]}>{item.payable_hours.toFixed(2)}</Text>
              </View>
            ))
          )}
        </Card>

        {/* --- Summary Card --- */}
        <Card style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Work Hours</Text>
            <Text style={styles.summaryValue}>{totalWorkHours.toFixed(2)} hrs</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Break Minutes</Text>
            <Text style={styles.summaryValue}>{totalBreakMinutes} mins</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Payable Hours</Text>
            <Text style={[styles.summaryValue, styles.totalPayableValue]}>{totalPayableHours.toFixed(2)} hrs</Text>
          </View>
        </Card>

        {/* --- Export Buttons --- */}
        <View style={styles.exportContainer}>
          <Button style={[styles.exportButton, { backgroundColor: theme.colors.success }]}><Text style={styles.exportButtonText}>Export as Excel</Text></Button>
          <Button style={[styles.exportButton, { backgroundColor: theme.colors.danger }]}><Text style={styles.exportButtonText}>Export as PDF</Text></Button>
          <Button style={[styles.exportButton, { backgroundColor: theme.colors.bodyText }]}><Text style={styles.exportButtonText}>Export as CSV</Text></Button>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  scrollContentContainer: {
    padding: theme.spacing(3),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(3),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  placeholderStyle: { fontSize: 16, color: '#999' },
  selectedTextStyle: { fontSize: 16 },
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
    fontWeight: '600',
    fontSize: 14,
    color: theme.colors.headingText,
  },
  tableCell: {
    fontSize: 14,
    color: theme.colors.bodyText,
  },
  noDataText: {
    textAlign: 'center',
    paddingVertical: theme.spacing(4),
    fontSize: 16,
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
  summaryCard: {
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
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  totalPayableValue: {
    color: theme.colors.success,
    fontSize: 18,
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
    fontWeight: 'bold'
  }
});

export default PayrollReport;