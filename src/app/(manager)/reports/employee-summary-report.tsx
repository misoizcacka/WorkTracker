import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { Dropdown } from 'react-native-element-dropdown';

// Mock Data
const employeeSummaryData = [
  { id: 'e1', name: 'John Worker', department: 'Field Ops', avatar: 'https://i.pravatar.cc/150?u=e1', regular: 160, overtime: 20, pay: 3800, projects: ['Alpha', 'Beta'] },
  { id: 'e2', name: 'Maria Builder', department: 'Field Ops', avatar: 'https://i.pravatar.cc/150?u=e2', regular: 150, overtime: 10, pay: 3630, projects: ['Alpha', 'Admin'] },
  { id: 'e3', name: 'Lars Mason', department: 'Field Ops', avatar: 'https://i.pravatar.cc/150?u=e3', regular: 160, overtime: 0, pay: 4000, projects: ['Beta'] },
  { id: 'e4', name: 'Chen Architect', department: 'Office', avatar: 'https://i.pravatar.cc/150?u=e4', regular: 160, overtime: 15, pay: 6387.5, projects: ['Alpha'] },
  { id: 'e5', name: 'Fatima Engineer', department: 'Office', avatar: 'https://i.pravatar.cc/150?u=e5', regular: 140, overtime: 5, pay: 4425, projects: ['Beta', 'Admin'] },
];

const departments = [
    { label: 'All Departments', value: 'all' },
    { label: 'Field Ops', value: 'Field Ops' },
    { label: 'Office', value: 'Office' },
];

type Range = 'last_week' | 'this_month' | 'custom';

const EmployeeSummaryReport = () => {
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [selectedRange, setSelectedRange] = useState<Range>('this_month');
    const [selectedDepartment, setSelectedDepartment] = useState('all');

    const filteredData = useMemo(() => {
        return employeeSummaryData.filter(item => 
            selectedDepartment === 'all' || item.department === selectedDepartment
        );
    }, [selectedDepartment]);

    const totalHours = filteredData.reduce((sum, e) => sum + e.regular + e.overtime, 0);
    const totalOt = filteredData.reduce((sum, e) => sum + e.overtime, 0);
    const totalPayroll = filteredData.reduce((sum, e) => sum + e.pay, 0);
    const avgHours = filteredData.length > 0 ? totalHours / filteredData.length : 0;

    const rangeButtons: { label: string, value: Range }[] = [
        { label: "Last Week", value: "last_week" },
        { label: "This Month", value: "this_month" },
        { label: "Custom", value: "custom" },
    ];

  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>Employee Summary Report</Text>

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
              style={[styles.dropdown, { flex: 1 }]}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={departments}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select Department"
              value={selectedDepartment}
              onChange={item => setSelectedDepartment(item.value)}
            />
          </View>
        </Card>

        {/* --- Summary Card --- */}
        <Card style={styles.summaryCard}>
            <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Hours</Text>
                <Text style={styles.summaryValue}>{totalHours.toFixed(0)} hrs</Text>
            </View>
            <View style={styles.summarySeparator} />
            <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Overtime</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.warning }]}>{totalOt.toFixed(0)} hrs</Text>
            </View>
            <View style={styles.summarySeparator} />
            <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Payroll</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.success }]}>€{totalPayroll.toFixed(2)}</Text>
            </View>
            <View style={styles.summarySeparator} />
            <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Avg. Hours/Employee</Text>
                <Text style={styles.summaryValue}>{avgHours.toFixed(1)} hrs</Text>
            </View>
        </Card>

        {/* --- Employee Table --- */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colEmployee]}>Employee</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]}>Total Hrs</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]}>Regular</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]}>Overtime</Text>
            <Text style={[styles.tableHeaderText, styles.colNumeric]}>Avg/Day</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total Pay</Text>
          </View>
          {filteredData.map(item => (
            <View key={item.id} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.colEmployee, { flexDirection: 'row', alignItems: 'center' }]}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View>
                    <Text style={styles.employeeName}>{item.name}</Text>
                    <Text style={styles.projectText}>{item.projects.join(', ')}</Text>
                </View>
              </View>
              <Text style={[styles.tableCellText, styles.colNumeric, styles.totalHoursValue]}>{(item.regular + item.overtime)}</Text>
              <Text style={[styles.tableCellText, styles.colNumeric]}>{item.regular}</Text>
              <Text style={[styles.tableCellText, styles.colNumeric, item.overtime > 0 && styles.otValue]}>{item.overtime}</Text>
              <Text style={[styles.tableCellText, styles.colNumeric]}>{((item.regular + item.overtime)/22).toFixed(1)}</Text>
              <Text style={[styles.tableCellText, styles.colTotal]}>€{item.pay.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.pageBackground },
  scrollContentContainer: { padding: theme.spacing(3) },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.headingText, marginBottom: theme.spacing(3) },
  filterCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
  filterControls: { flexDirection: 'row', alignItems: 'center' },
  rangeSelector: { flexDirection: 'row', backgroundColor: theme.colors.pageBackground, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.borderColor, overflow: 'hidden', marginRight: theme.spacing(2) },
  rangeButton: { paddingVertical: 12, paddingHorizontal: 16 },
  rangeButtonActive: { backgroundColor: theme.colors.primary },
  rangeButtonText: { fontSize: 14, fontWeight: '500', color: theme.colors.bodyText },
  rangeButtonTextActive: { color: 'white' },
  dropdown: { height: 48, borderColor: theme.colors.borderColor, borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 15, backgroundColor: theme.colors.pageBackground },
  placeholderStyle: { fontSize: 16, color: '#999' },
  selectedTextStyle: { fontSize: 16 },
  summaryCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3), flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: theme.colors.bodyText, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: theme.colors.headingText },
  summarySeparator: { width: 1, backgroundColor: theme.colors.borderColor },
  tableCard: { backgroundColor: theme.colors.cardBackground, borderRadius: theme.radius.lg, ...theme.shadow.soft },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: theme.colors.borderColor, paddingBottom: theme.spacing(1), paddingHorizontal: theme.spacing(2), paddingTop: theme.spacing(2) },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.borderColor, paddingVertical: theme.spacing(1.5), alignItems: 'center', paddingHorizontal: theme.spacing(2) },
  tableHeaderText: { fontWeight: '600', fontSize: 14, color: theme.colors.headingText },
  tableCell: { flexDirection: 'row', alignItems: 'center' },
  tableCellText: { fontSize: 14, color: theme.colors.bodyText },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: theme.spacing(1.5) },
  employeeName: { fontWeight: '600', color: theme.colors.headingText },
  projectText: { fontSize: 12, color: theme.colors.bodyText },
  colEmployee: { flex: 3 },
  colNumeric: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right', fontWeight: 'bold' },
  totalHoursValue: { fontWeight: 'bold', color: theme.colors.primary },
  otValue: { color: theme.colors.warning, fontWeight: 'bold' },
});

export default EmployeeSummaryReport;
