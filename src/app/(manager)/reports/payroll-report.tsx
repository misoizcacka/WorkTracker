import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { Dropdown } from 'react-native-element-dropdown';
import { Button } from '../../../components/Button';

// Mock Data
const payrollData = [
  { id: '1', name: 'John Worker', rate: 20, regularHours: 160, otHours: 8 },
  { id: '2', name: 'Maria Builder', rate: 22, regularHours: 150, otHours: 10 },
  { id: '3', name: 'Lars Mason', rate: 25, regularHours: 160, otHours: 0 },
  { id: '4', name: 'Chen Architect', rate: 35, regularHours: 160, otHours: 15 },
  { id: '5', name: 'Fatima Engineer', rate: 30, regularHours: 140, otHours: 0 },
];

const employees = payrollData.map(e => ({ label: e.name, value: e.id }));
employees.unshift({ label: 'All Employees', value: 'all' });

type Range = 'yesterday' | 'last_week' | 'this_month';

const PayrollReport = () => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [selectedRange, setSelectedRange] = useState<Range>('this_month');
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  const getGrossPay = (rate: number, regular: number, ot: number) => {
    const otRate = rate * 1.5;
    return (regular * rate) + (ot * otRate);
  };

  const filteredData = payrollData.filter(item => 
    selectedEmployee === 'all' || item.id === selectedEmployee
  );

  const totalRegularHours = filteredData.reduce((sum, item) => sum + item.regularHours, 0);
  const totalOtHours = filteredData.reduce((sum, item) => sum + item.otHours, 0);
  const totalWages = filteredData.reduce((sum, item) => sum + getGrossPay(item.rate, item.regularHours, item.otHours), 0);

  const rangeButtons: { label: string, value: Range }[] = [
    { label: "Yesterday", value: "yesterday" },
    { label: "Last Week", value: "last_week" },
    { label: "This Month", value: "this_month" },
  ];

  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>Payroll Report</Text>

        {/* --- Filters --- */}
        <Card style={styles.filterCard}>
          <View style={styles.filterControls}>
            <View style={styles.rangeSelector}>
              {rangeButtons.map(button => (
                <TouchableOpacity 
                  key={button.value} 
                  style={[styles.rangeButton, selectedRange === button.value && styles.rangeButtonActive]} 
                  onPress={() => setSelectedRange(button.value)}
                >
                  <Text style={[styles.rangeButtonText, selectedRange === button.value && styles.rangeButtonTextActive]}>{button.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={employees}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select Employee"
              value={selectedEmployee}
              onChange={item => setSelectedEmployee(item.value)}
            />
          </View>
        </Card>

        {/* --- Payroll Table --- */}
        <Card style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colEmployee]}>Employee</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]}>Rate</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]}>Regular (hrs)</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]}>OT (hrs)</Text>
            <Text style={[styles.tableHeaderText, styles.colGrossPay]}>Gross Pay</Text>
          </View>
          {filteredData.map(item => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colEmployee]}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.colNumeric]}>€{item.rate.toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.colNumeric]}>{item.regularHours}</Text>
              <Text style={[styles.tableCell, styles.colNumeric]}>{item.otHours}</Text>
              <Text style={[styles.tableCell, styles.colGrossPay]}>€{getGrossPay(item.rate, item.regularHours, item.otHours).toFixed(2)}</Text>
            </View>
          ))}
        </Card>

        {/* --- Summary Card --- */}
        <Card style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Regular Hours</Text>
            <Text style={styles.summaryValue}>{totalRegularHours} hrs</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total OT Hours</Text>
            <Text style={styles.summaryValue}>{totalOtHours} hrs</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Wages</Text>
            <Text style={[styles.summaryValue, styles.totalWagesValue]}>€{totalWages.toFixed(2)}</Text>
          </View>
        </Card>

        {/* --- Export Buttons --- */}
        <View style={styles.exportContainer}>
            <Button style={[styles.exportButton, {backgroundColor: theme.colors.success}]}><Text style={styles.exportButtonText}>Export as Excel</Text></Button>
            <Button style={[styles.exportButton, {backgroundColor: theme.colors.danger}]}><Text style={styles.exportButtonText}>Export as PDF</Text></Button>
            <Button style={[styles.exportButton, {backgroundColor: theme.colors.bodyText}]}><Text style={styles.exportButtonText}>Export as CSV</Text></Button>
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
    justifyContent: 'space-between',
  },
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    overflow: 'hidden',
    flex: 1,
    marginRight: theme.spacing(2)
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rangeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  rangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.bodyText,
  },
  rangeButtonTextActive: {
    color: 'white',
  },
  dropdown: {
    height: 48,
    width: 200,
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
  colEmployee: {
    flex: 3,
  },
  colNumeric: {
    flex: 1.5,
    textAlign: 'right',
  },
  colGrossPay: {
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
  totalWagesValue: {
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
