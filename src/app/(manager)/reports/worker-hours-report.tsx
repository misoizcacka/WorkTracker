import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity } from "react-native";
import AnimatedScreen from "../../../components/AnimatedScreen";
import { theme } from "../../../theme";
import { Card } from "../../../components/Card";
import { Dropdown } from "react-native-element-dropdown";
import { Ionicons } from '@expo/vector-icons';

// --- Mock Data ---
const allProjects = [
    { label: 'All Projects', value: 'all' },
    { label: 'Project Alpha', value: 'p1' },
    { label: 'Project Beta', value: 'p2' },
    { label: 'General Admin', value: 'p3' },
];

const reportsData = [
  { 
    id: "1", name: "John Worker", regularHours: 160, overtimeHours: 8, 
    projects: [{ id: 'p1', name: 'Project Alpha', hours: 128 }, { id: 'p2', name: 'Project Beta', hours: 40 }] 
  },
  { 
    id: "2", name: "Maria Builder", regularHours: 160, overtimeHours: 0,
    projects: [{ id: 'p1', name: 'Project Alpha', hours: 80 }, { id: 'p2', name: 'Project Beta', hours: 80 }]
  },
  { 
    id: "3", name: "Lars Mason", regularHours: 140, overtimeHours: 12,
    projects: [{ id: 'p2', name: 'Project Beta', hours: 152 }]
  },
  { 
    id: "4", name: "Chen Architect", regularHours: 160, overtimeHours: 15,
    projects: [{ id: 'p1', name: 'Project Alpha', hours: 175 }]
   },
  { 
    id: "5", name: "Fatima Engineer", regularHours: 140, overtimeHours: 0,
    projects: [{ id: 'p1', name: 'Project Alpha', hours: 100 }, { id: 'p3', name: 'General Admin', hours: 40 }]
  },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => ({ label: `${currentYear - i}`, value: currentYear - i }));
const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
].map((month, i) => ({ label: month, value: i + 1 }));

type Range = 'yesterday' | 'last_week' | 'monthly';
// --- End Mock Data ---


export default function WorkerHoursReport() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedRange, setSelectedRange] = useState<Range>('monthly');
  const [selectedProject, setSelectedProject] = useState('all');

  const filteredData = useMemo(() => {
    if (selectedProject === 'all') return reportsData;
    return reportsData.filter(report => report.projects.some(p => p.id === selectedProject));
  }, [selectedProject]);

  const totalHours = filteredData.reduce((sum, report) => sum + report.regularHours + report.overtimeHours, 0);
  const totalOvertime = filteredData.reduce((sum, report) => sum + report.overtimeHours, 0);
  const averageHours = filteredData.length > 0 ? totalHours / filteredData.length : 0;

  const ProgressBar = ({ progress }: { progress: number }) => {
    const progressPercentage = Math.min(progress, 100);
    return (
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
      </View>
    );
  };

  const rangeButtons: { label: string, value: Range }[] = [
    { label: "Yesterday", value: "yesterday" },
    { label: "Last Week", value: "last_week" },
    { label: "Monthly", value: "monthly" },
  ];

  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>Worker Hours Report</Text>
        
        <View style={styles.layout}>
          <View style={styles.mainContent}>
            <Text style={styles.sectionTitle}>Worker Hours Breakdown</Text>
            {filteredData.map((item) => {
                const totalWorkerHours = item.regularHours + item.overtimeHours;
                return(
                <Card key={item.id} style={styles.reportItemCard}>
                    <View style={styles.workerHeader}>
                        <Text style={styles.workerName}>{item.name}</Text>
                        <View style={styles.hoursAndProgress}>
                            <Text style={styles.workerTotalHours}>{totalWorkerHours} hrs</Text>
                            <ProgressBar progress={(totalWorkerHours / 160) * 100} />
                        </View>
                    </View>
                    <View style={styles.hoursBreakdown}>
                        <View style={styles.hourSegment}>
                            <Text style={styles.hourLabel}>Regular</Text>
                            <Text style={styles.hourValue}>{item.regularHours} hrs</Text>
                        </View>
                        <View style={styles.hourSegment}>
                            <Text style={styles.hourLabel}>Overtime</Text>
                            <Text style={[styles.hourValue, item.overtimeHours > 0 && styles.overtimeValue]}>{item.overtimeHours} hrs</Text>
                        </View>
                        <View style={styles.hourSegment}>
                            <Text style={styles.hourLabel}>Avg/Day</Text>
                            <Text style={styles.hourValue}>{(totalWorkerHours / 22).toFixed(1)} hrs</Text>
                        </View>
                    </View>
                    <View style={styles.projectSection}>
                        <Text style={styles.projectTitle}>Projects</Text>
                        {item.projects.map(proj => (
                            <View key={proj.id} style={styles.projectRow}>
                                <Text style={styles.projectName}>{proj.name}</Text>
                                <Text style={styles.projectHours}>{proj.hours} hrs</Text>
                            </View>
                        ))}
                    </View>
                </Card>
            )})}
          </View>
          
          {isLargeScreen && (
            <View style={styles.sidebar}>
              <Card style={styles.summaryCard}>
                <Text style={styles.cardTitle}>Report Summary</Text>
                {/* --- Filters --- */}
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
                {selectedRange === 'monthly' && (
                  <View style={styles.dateSelectors}>
                    <Dropdown style={styles.dropdown} data={months} maxHeight={300} labelField="label" valueField="value" placeholder="Select Month" value={selectedMonth} onChange={item => setSelectedMonth(item.value)} />
                    <Dropdown style={styles.dropdown} data={years} maxHeight={300} labelField="label" valueField="value" placeholder="Select Year" value={selectedYear} onChange={item => setSelectedYear(item.value)} />
                  </View>
                )}
                 <Dropdown style={[styles.dropdown, {marginTop: 10}]} data={allProjects} maxHeight={300} labelField="label" valueField="value" placeholder="Filter by Project" value={selectedProject} onChange={item => setSelectedProject(item.value)} />
                <View style={styles.separator} />
                {/* --- Summary --- */}
                <View style={styles.summaryRow}>
                  <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.summaryLabel}>Total Hours:</Text>
                  <Text style={styles.summaryValue}>{totalHours} hrs</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Ionicons name="alarm-outline" size={24} color={theme.colors.warning} />
                  <Text style={styles.summaryLabel}>Total Overtime:</Text>
                  <Text style={styles.summaryValue}>{totalOvertime} hrs</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Ionicons name="person-outline" size={24} color={theme.colors.bodyText} />
                  <Text style={styles.summaryLabel}>Avg. Hours/Worker:</Text>
                  <Text style={styles.summaryValue}>{averageHours.toFixed(1)} hrs</Text>
                </View>
              </Card>
            </View>
          )}
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.pageBackground },
  scrollContentContainer: { padding: theme.spacing(3) },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.headingText, marginBottom: theme.spacing(3) },
  sectionTitle: { fontSize: 22, fontWeight: '600', color: theme.colors.headingText, marginBottom: theme.spacing(2) },
  layout: { flexDirection: 'row' },
  mainContent: { flex: 1 },
  sidebar: { width: 320, marginLeft: theme.spacing(3) },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: theme.spacing(2), color: theme.colors.headingText },
  reportItemCard: { marginBottom: theme.spacing(2), padding: theme.spacing(2) },
  workerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workerName: { fontSize: 18, fontWeight: "600", color: theme.colors.headingText },
  hoursAndProgress: { width: 120, alignItems: 'flex-end' },
  workerTotalHours: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 4, },
  hoursBreakdown: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: theme.colors.pageBackground, borderRadius: theme.radius.md, padding: theme.spacing(1), marginTop: theme.spacing(1.5) },
  hourSegment: { alignItems: 'center' },
  hourLabel: { fontSize: 12, color: theme.colors.bodyText },
  hourValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.headingText },
  overtimeValue: { color: theme.colors.warning },
  projectSection: { marginTop: theme.spacing(2), borderTopWidth: 1, borderTopColor: theme.colors.borderColor, paddingTop: theme.spacing(1.5) },
  projectTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.bodyText, marginBottom: theme.spacing(1) },
  projectRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  projectName: { fontSize: 14, color: theme.colors.bodyText },
  projectHours: { fontSize: 14, fontWeight: '500', color: theme.colors.headingText },
  summaryCard: { padding: theme.spacing(2) },
  rangeSelector: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.colors.pageBackground, borderRadius: theme.radius.md, marginBottom: theme.spacing(1), borderWidth: 1, borderColor: theme.colors.borderColor, overflow: 'hidden' },
  rangeButton: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  rangeButtonActive: { backgroundColor: theme.colors.primary },
  rangeButtonText: { fontSize: 14, fontWeight: '500', color: theme.colors.bodyText },
  rangeButtonTextActive: { color: 'white' },
  dateSelectors: { marginBottom: theme.spacing(1) },
  dropdown: { height: 50, borderColor: theme.colors.borderColor, borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 15, marginBottom: 10, backgroundColor: 'white' },
  separator: { height: 1, backgroundColor: theme.colors.borderColor, marginVertical: theme.spacing(2) },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing(1), marginBottom: theme.spacing(0.5) },
  summaryLabel: { fontSize: 16, color: theme.colors.bodyText, marginLeft: theme.spacing(1.5), flex: 1 },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.headingText },
  progressBarBackground: { height: 8, width: '100%', backgroundColor: theme.colors.borderColor, borderRadius: 4, marginTop: 4 },
  progressBarFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
});
