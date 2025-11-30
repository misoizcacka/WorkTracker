import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { Dropdown } from 'react-native-element-dropdown';

// Mock Data
const overtimeData = [
  { id: '1', name: 'John Worker', regular: 160, overtime: 20, holiday: 8 }, // Exceeds limit
  { id: '2', name: 'Maria Builder', rate: 22, regular: 150, overtime: 10, holiday: 0 },
  { id: '3', name: 'Lars Mason', rate: 25, regular: 160, overtime: 0, holiday: 0 },
  { id: '4', name: 'Chen Architect', rate: 35, regular: 160, overtime: 30, holiday: 16 }, // Exceeds limit
  { id: '5', name: 'Fatima Engineer', rate: 30, regular: 140, overtime: 5, holiday: 0 },
];

// EU Working Time Directive: Average of 48 hours per week
const WEEKLY_HOUR_LIMIT = 48;
const WEEKS_IN_MONTH = 4; // Simplified for this mock

const employees = overtimeData.map(e => ({ label: e.name, value: e.id }));
employees.unshift({ label: 'All Employees', value: 'all' });

type Range = 'last_week' | 'this_month' | 'last_month';

const OvertimeReport = () => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [selectedRange, setSelectedRange] = useState<Range>('this_month');
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  const filteredData = overtimeData.filter(item => 
    selectedEmployee === 'all' || item.id === selectedEmployee
  );

  const employeesInBreach = filteredData.filter(e => ((e.regular + e.overtime + e.holiday) / WEEKS_IN_MONTH) > WEEKLY_HOUR_LIMIT);
  
  const totalRegular = filteredData.reduce((sum, item) => sum + item.regular, 0);
  const totalOvertime = filteredData.reduce((sum, item) => sum + item.overtime, 0);
  const totalHoliday = filteredData.reduce((sum, item) => sum + item.holiday, 0);

  const rangeButtons: { label: string, value: Range }[] = [
    { label: "Last Week", value: "last_week" },
    { label: "This Month", value: "this_month" },
    { label: "Last Month", value: "last_month" },
  ];

  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>Overtime Report</Text>

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

        {/* --- Overtime Table --- */}
        <Card style={styles.tableCard}>
          <Text style={styles.cardTitle}>Hours Breakdown</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colEmployee]}>Employee</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]}>Regular</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]}>Overtime</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]}>Sunday/Holiday</Text>
          </View>
          {filteredData.map(item => {
            const weeklyAverage = (item.regular + item.overtime + item.holiday) / WEEKS_IN_MONTH;
            const isInBreach = weeklyAverage > WEEKLY_HOUR_LIMIT;
            return (
              <View key={item.id} style={[styles.tableRow, isInBreach && styles.tableRowWarning]}>
                <Text style={[styles.tableCell, styles.colEmployee]}>
                    {isInBreach && <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />} {item.name}
                </Text>
                <Text style={[styles.tableCell, styles.colNumeric]}>{item.regular} hrs</Text>
                <Text style={[styles.tableCell, styles.colNumeric, item.overtime > 0 && styles.overtimeValue]}>{item.overtime} hrs</Text>
                <Text style={[styles.tableCell, styles.colNumeric, item.holiday > 0 && styles.holidayValue]}>{item.holiday} hrs</Text>
              </View>
            )
          })}

          {employeesInBreach.length > 0 && (
            <View style={styles.warningSection}>
                <Ionicons name="warning" size={24} color={theme.colors.warning} />
                <View style={{marginLeft: 10}}>
                    <Text style={styles.warningTitle}>Compliance Alert</Text>
                    <Text style={styles.warningText}>
                        {employeesInBreach.map(e => e.name).join(', ')} may be exceeding the 48-hour average weekly work limit.
                    </Text>
                </View>
            </View>
          )}
        </Card>

        {/* --- Summary Card --- */}
        <Card style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Totals</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Regular Hours</Text>
            <Text style={styles.summaryValue}>{totalRegular} hrs</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Overtime Hours</Text>
            <Text style={[styles.summaryValue, styles.overtimeValue]}>{totalOvertime} hrs</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Sunday/Holiday Hours</Text>
            <Text style={[styles.summaryValue, styles.holidayValue]}>{totalHoliday} hrs</Text>
          </View>
        </Card>
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
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2),
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
  tableRowWarning: {
    backgroundColor: theme.colors.warningMuted,
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
    flex: 2.5,
  },
  colNumeric: {
    flex: 1.5,
    textAlign: 'right',
  },
  overtimeValue: {
    color: theme.colors.warning,
    fontWeight: 'bold',
  },
  holidayValue: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.warningMuted,
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  warningTitle: {
      fontWeight: 'bold',
      color: theme.colors.warning,
      fontSize: 16
  },
  warningText: {
    color: theme.colors.warning,
    flex: 1,
  },
  summaryCard: {
    padding: theme.spacing(2),
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
});

export default OvertimeReport;
