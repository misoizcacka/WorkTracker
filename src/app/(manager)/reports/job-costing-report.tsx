import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { Dropdown } from 'react-native-element-dropdown';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Mock Data ---
const mockProjects = [
  {
    id: 'p1', name: 'Project Alpha', icon: 'cube-outline',
    employees: [
      { id: 'e1', name: 'John Worker', rate: 20, dailyLogs: [{ date: '2025-11-28', in: '08:00', out: '17:30', break: '45m', regular: 8, ot: 0.75, notes: 'API integration' }] },
      { id: 'e2', name: 'Maria Builder', rate: 22, dailyLogs: [{ date: '2025-11-27', in: '09:00', out: '17:00', break: '30m', regular: 7.5, ot: 0, notes: 'Client feedback' }] },
    ]
  },
  {
    id: 'p2', name: 'Project Beta', icon: 'layers-outline',
    employees: [
        { id: 'e1', name: 'John Worker', rate: 20, dailyLogs: [{ date: '2025-11-26', in: '08:30', out: '17:30', break: '60m', regular: 8, ot: 0, notes: 'Planning session' }] },
        { id: 'e3', name: 'Lars Mason', rate: 25, dailyLogs: [{ date: '2025-11-26', in: '08:00', out: '18:00', break: '60m', regular: 8, ot: 1, notes: 'Backend module' }] },
    ]
  },
  {
    id: 'p3', name: 'General Admin', icon: 'cog-outline',
    employees: [
        { id: 'e2', name: 'Maria Builder', rate: 22, dailyLogs: [{ date: '2025-11-25', in: '10:00', out: '12:00', break: '0m', regular: 2, ot: 0, notes: 'Team meeting' }] },
    ]
  }
];

const allProjectsFilter = [{ label: 'All Projects', value: 'all' }, ...mockProjects.map(p => ({label: p.name, value: p.id}))];
const allEmployeesFilter = [{ label: 'All Employees', value: 'all' }, { label: 'John Worker', value: 'e1' }, { label: 'Maria Builder', value: 'e2' }, { label: 'Lars Mason', value: 'e3' }];
// --- End Mock Data ---


const JobCostingReport = () => {
    const [selectedProject, setSelectedProject] = useState('all');
    const [selectedEmployee, setSelectedEmployee] = useState('all');
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

    const getLaborCost = (rate: number, regular: number, ot: number) => (regular * rate) + (ot * (rate * 1.5));
    
    const filteredProjects = useMemo(() => {
        let projects = mockProjects;
        if(selectedProject !== 'all') {
            projects = projects.filter(p => p.id === selectedProject);
        }
        if (selectedEmployee !== 'all') {
            projects = projects.map(p => ({...p, employees: p.employees.filter(e => e.id === selectedEmployee)})).filter(p => p.employees.length > 0);
        }
        return projects;
    }, [selectedProject, selectedEmployee]);

    useEffect(() => {
        if(selectedProject !== 'all' && filteredProjects.length === 1) {
            setExpandedProject(filteredProjects[0].id);
        } else {
            setExpandedProject(null);
        }
    }, [selectedProject]);


    const overallSummary = useMemo(() => {
        let totalCost = 0, totalHours = 0, totalOt = 0;
        filteredProjects.forEach(p => p.employees.forEach(e => e.dailyLogs.forEach(l => {
            totalCost += getLaborCost(e.rate, l.regular, l.ot);
            totalHours += l.regular + l.ot;
            totalOt += l.ot;
        })));
        return { totalCost, totalHours, totalOt };
    }, [filteredProjects]);

    const toggle = (setter: React.Dispatch<React.SetStateAction<string | null>>, value: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setter((prev: string | null) => (prev === value ? null : value));
    };

    return (
        <AnimatedScreen>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
            <Text style={styles.title}>Job Costing Report</Text>

            <Card style={styles.filterCard}>
                <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Filter by:</Text>
                    <Dropdown style={styles.dropdown} data={allProjectsFilter} labelField="label" valueField="value" placeholder="All Projects" value={selectedProject} onChange={item => setSelectedProject(item.value)} />
                    <Dropdown style={styles.dropdown} data={allEmployeesFilter} labelField="label" valueField="value" placeholder="All Employees" value={selectedEmployee} onChange={item => setSelectedEmployee(item.value)} />
                </View>
            </Card>

            <Card style={styles.summaryCard}>
                <Text style={styles.cardTitle}>Overall Summary</Text>
                <View style={styles.summaryContent}>
                    <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Total Labor Cost</Text><Text style={styles.summaryValueLg}>€{overallSummary.totalCost.toFixed(2)}</Text></View>
                    <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Total Hours</Text><Text style={styles.summaryValue}>{overallSummary.totalHours.toFixed(1)} hrs</Text></View>
                    <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Total OT</Text><Text style={[styles.summaryValue, {color: theme.colors.warning}]}>{overallSummary.totalOt.toFixed(1)} hrs</Text></View>
                </View>
            </Card>

            {filteredProjects.map(project => {
                const projectCost = project.employees.reduce((sum, e) => sum + e.dailyLogs.reduce((s,l) => s + getLaborCost(e.rate,l.regular,l.ot), 0), 0);
                const projectHours = project.employees.reduce((sum, e) => sum + e.dailyLogs.reduce((s,l) => s + l.regular + l.ot, 0), 0);
                
                return (
                    <Card key={project.id} style={styles.projectCard}>
                        <TouchableOpacity style={styles.projectHeader} onPress={() => toggle(setExpandedProject, project.id)}>
                            <Ionicons name={project.icon as any} size={24} color={theme.colors.primary} />
                            <Text style={styles.projectTitle}>{project.name}</Text>
                            <View style={{flexDirection: 'row', flex: 1, justifyContent: 'flex-end'}}>
                                <Text style={styles.projectSummaryText}>Cost: <Text style={{fontWeight: 'bold'}}>€{projectCost.toFixed(2)}</Text></Text>
                                <Text style={styles.projectSummaryText}>Hours: <Text style={{fontWeight: 'bold'}}>{projectHours.toFixed(1)}</Text></Text>
                            </View>
                            <Ionicons name={expandedProject === project.id ? 'chevron-up-outline' : 'chevron-down-outline'} size={24} color={theme.colors.bodyText} />
                        </TouchableOpacity>

                        {expandedProject === project.id && (
                            <View style={styles.employeeSection}>
                                <View style={styles.employeeTableHeader}>
                                    <Text style={[styles.employeeHeaderText, {flex: 2}]}>Employee</Text>
                                    <Text style={[styles.employeeHeaderText, {flex: 1, textAlign: 'right'}]}>Total Hrs</Text>
                                    <Text style={[styles.employeeHeaderText, {flex: 1, textAlign: 'right'}]}>OT Hrs</Text>
                                    <Text style={[styles.employeeHeaderText, {flex: 1.2, textAlign: 'right'}]}>Labor Cost</Text>
                                </View>

                                {project.employees.map(employee => {
                                    const employeeCost = employee.dailyLogs.reduce((s,l) => s + getLaborCost(employee.rate,l.regular,l.ot), 0);
                                    const employeeHours = employee.dailyLogs.reduce((s,l) => s + l.regular + l.ot, 0);
                                    const employeeOt = employee.dailyLogs.reduce((s,l) => s + l.ot, 0);
                                    
                                    return (
                                        <View key={employee.id} style={[styles.employeeContainer, selectedEmployee === employee.id && styles.employeeHighlight]}>
                                            <TouchableOpacity style={styles.employeeRow} onPress={() => toggle(setExpandedEmployee, employee.id)}>
                                                <Text style={styles.employeeName}>{employee.name}</Text>
                                                <View style={{flexDirection: 'row', flex: 1, justifyContent: 'flex-end', alignItems: 'center'}}>
                                                    <Text style={[styles.employeeCell, {width: 60}]}>{employeeHours.toFixed(1)}</Text>
                                                    <Text style={[styles.employeeCell, {width: 60, color: employeeOt > 0 ? theme.colors.warning : theme.colors.bodyText}]}>{employeeOt.toFixed(1)}</Text>
                                                    <Text style={[styles.employeeCell, {width: 80, fontWeight: 'bold'}]}>€{employeeCost.toFixed(2)}</Text>
                                                </View>
                                                <Ionicons name={expandedEmployee === employee.id ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} color={theme.colors.bodyText} />
                                            </TouchableOpacity>

                                            {expandedEmployee === employee.id && (
                                                <View style={styles.dailyLogTable}>
                                                    <View style={styles.dailyLogHeader}>
                                                        <Text style={[styles.dailyLogHeaderText, {flex: 1}]}>Date</Text>
                                                        <Text style={[styles.dailyLogHeaderText, {flex: 2}]}>Time</Text>
                                                        <Text style={[styles.dailyLogHeaderText, {flex: 3}]}>Notes</Text>
                                                        <Text style={[styles.dailyLogHeaderText, {flex: 1, textAlign: 'right'}]}>Hours</Text>
                                                    </View>
                                                    {employee.dailyLogs.map((log, index) => (
                                                        <View key={index} style={styles.dailyLogRow}>
                                                            <Text style={styles.dailyLogCell}>{log.date}</Text>
                                                            <Text style={[styles.dailyLogCell, {flex: 2}]}>{log.in} - {log.out} ({log.break})</Text>
                                                            <Text style={[styles.dailyLogCell, {flex: 3, fontStyle: 'italic'}]}>{log.notes}</Text>
                                                            <Text style={[styles.dailyLogCell, {flex: 1, textAlign: 'right', fontWeight: '500'}]}>{(log.regular + log.ot).toFixed(2)}h</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    )
                                })}
                            </View>
                        )}
                    </Card>
                )
            })}
        </ScrollView>
        </AnimatedScreen>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.pageBackground },
    scrollContentContainer: { padding: theme.spacing(3) },
    title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.headingText, marginBottom: theme.spacing(3) },
    filterCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
    filterRow: { flexDirection: 'row', alignItems: 'center' },
    filterLabel: { fontSize: 16, fontWeight: '500', color: theme.colors.bodyText, marginRight: theme.spacing(1) },
    dropdown: { flex: 1, height: 48, borderColor: theme.colors.borderColor, borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 15, backgroundColor: 'white', marginLeft: theme.spacing(1) },
    summaryCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
    cardTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.headingText, marginBottom: theme.spacing(2) },
    summaryContent: { flexDirection: 'row', justifyContent: 'space-around' },
    summaryItem: { alignItems: 'center', flex: 1 },
    summaryLabel: { fontSize: 14, color: theme.colors.bodyText, marginBottom: 4 },
    summaryValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.headingText },
    summaryValueLg: { fontSize: 24, fontWeight: 'bold', color: theme.colors.success },
    projectCard: { marginBottom: theme.spacing(2), padding: 0, overflow: 'hidden' },
    projectHeader: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing(1.5), backgroundColor: theme.colors.cardBackground },
    projectTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.headingText, marginLeft: theme.spacing(1.5), flexShrink: 1 },
    projectSummaryText: { fontSize: 14, color: theme.colors.bodyText, marginLeft: theme.spacing(2) },
    employeeSection: { borderTopWidth: 1, borderTopColor: theme.colors.borderColor },
    employeeTableHeader: { flexDirection: 'row', paddingHorizontal: theme.spacing(1.5), paddingVertical: theme.spacing(1), backgroundColor: theme.colors.pageBackground, borderBottomWidth: 1, borderBottomColor: theme.colors.borderColor },
    employeeHeaderText: { fontWeight: '600', color: theme.colors.bodyText, fontSize: 12 },
    employeeContainer: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderColor },
    employeeHighlight: { backgroundColor: theme.colors.primaryMuted },
    employeeRow: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing(1.5), backgroundColor: theme.colors.cardBackground },
    employeeName: { fontSize: 16, fontWeight: '600', color: theme.colors.headingText, flex: 2 },
    employeeCell: { fontSize: 14, textAlign: 'right', color: theme.colors.bodyText },
    dailyLogTable: { backgroundColor: theme.colors.pageBackground, padding: theme.spacing(1.5), borderTopWidth: 1, borderTopColor: theme.colors.borderColor },
    dailyLogHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.borderColor, paddingBottom: 4, marginBottom: 4},
    dailyLogHeaderText: { fontWeight: '600', color: theme.colors.bodyText, fontSize: 12 },
    dailyLogRow: { flexDirection: 'row', paddingVertical: 4, alignItems: 'center' },
    dailyLogCell: { flex: 1, color: theme.colors.bodyText, fontSize: 12 },
});

export default JobCostingReport;
