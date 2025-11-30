import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { Dropdown } from 'react-native-element-dropdown';
import CrossPlatformDatePicker from '../../../components/CrossPlatformDatePicker';

// --- Mock Data ---
interface Activity {
    projId: string;
    projName: string;
    in: string;
    out: string;
    break: string;
    hours: string;
    notes: string;
}

interface DailyActivityData {
    [key: string]: Activity[];
}

const allProjects = [
    { label: 'All Projects', value: 'all' },
    { label: 'Project Alpha', value: 'p1' },
    { label: 'Project Beta', value: 'p2' },
    { label: 'General Admin', value: 'p3' },
];

const dailyActivityData: DailyActivityData = {
    'e1': [
        { projId: 'p1', projName: 'Project Alpha', in: '08:00', out: '12:00', break: '15m', hours: '3h 45m', notes: 'Initial setup and component scaffolding.'},
        { projId: 'p1', projName: 'Project Alpha', in: '12:30', out: '17:30', break: '15m', hours: '4h 45m', notes: 'API integration and testing.'},
        { projId: 'p3', projName: 'General Admin', in: '17:30', out: '18:15', break: '0m', hours: '0h 45m', notes: 'End of day reporting.'},
    ],
    'e2': [
        { projId: 'p2', projName: 'Project Beta', in: '09:00', out: '13:00', break: '0m', hours: '4h 0m', notes: 'Client feedback implementation.'},
        { projId: 'p2', projName: 'Project Beta', in: '13:30', out: '17:00', break: '0m', hours: '3h 30m', notes: ''},
    ],
    'e3': [
        { projId: 'p1', projName: 'Project Alpha', in: '08:30', out: '12:30', break: '0m', hours: '4h 0m', notes: 'Database schema design.'},
        { projId: 'p2', projName: 'Project Beta', in: '13:00', out: '18:00', break: '30m', hours: '4h 30m', notes: 'Backend logic for new module.'},
    ],
    'e4': [
        { projId: 'p3', projName: 'General Admin', in: '09:00', out: '17:00', break: '60m', hours: '7h 0m', notes: 'HR and payroll processing.'},
    ],
    'e5': [
        { projId: 'p1', projName: 'Project Alpha', in: '10:00', out: '18:00', break: '30m', hours: '7h 30m', notes: 'UI/UX design updates.'},
    ],
};

const employeeOverview = [
    { id: 'e1', name: 'John Worker', avatar: 'https://i.pravatar.cc/150?u=e1', totalHours: '9h 15m', overtime: '1h 15m', projectCount: 2 },
    { id: 'e2', name: 'Maria Builder', avatar: 'https://i.pravatar.cc/150?u=e2', totalHours: '7h 30m', overtime: '0h 0m', projectCount: 1 },
    { id: 'e3', name: 'Lars Mason', avatar: 'https://i.pravatar.cc/150?u=e3', totalHours: '8h 30m', overtime: '0h 30m', projectCount: 2 },
    { id: 'e4', name: 'Chen Architect', avatar: 'https://i.pravatar.cc/150?u=e4', totalHours: '7h 0m', overtime: '0h 0m', projectCount: 1 },
    { id: 'e5', name: 'Fatima Engineer', avatar: 'https://i.pravatar.cc/150?u=e5', totalHours: '7h 30m', overtime: '0h 0m', projectCount: 1 },
];
// --- End Mock Data ---


const DailyDetailedReport = () => {
    const [selectedDate, setDate] = useState(new Date());
    const [selectedProject, setSelectedProject] = useState('all');
    const [selectedWorker, setSelectedWorker] = useState<typeof employeeOverview[0] | null>(null);

    const workerActivities = useMemo(() => {
        if (!selectedWorker) return [];
        const activities: Activity[] = dailyActivityData[selectedWorker.id] || [];
        return activities.filter((act: Activity) => selectedProject === 'all' || act.projId === selectedProject);
    }, [selectedWorker, selectedProject]);
    
    // Main view showing list of all workers
    const renderOverview = () => (
        <>
            {employeeOverview.map(worker => (
                <TouchableOpacity key={worker.id} onPress={() => setSelectedWorker(worker)}>
                    <Card style={styles.workerRowCard}>
                        <Image source={{ uri: worker.avatar }} style={styles.avatar} />
                        <View style={styles.workerInfo}>
                            <Text style={styles.employeeName}>{worker.name}</Text>
                            <Text style={styles.projectCount}>{worker.projectCount} project(s)</Text>
                        </View>
                        <View style={styles.workerHours}>
                            <Text style={styles.hoursLabel}>Total</Text>
                            <Text style={styles.hoursValue}>{worker.totalHours}</Text>
                        </View>
                        <View style={styles.workerHours}>
                            <Text style={styles.hoursLabel}>Overtime</Text>
                            <Text style={[styles.hoursValue, {color: theme.colors.warning}]}>{worker.overtime}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
                    </Card>
                </TouchableOpacity>
            ))}
        </>
    );

    // Drill-down view for a single worker
    const renderDrillDown = () => {
        if (!selectedWorker) return null;

        return (
            <>
                <TouchableOpacity style={styles.backButton} onPress={() => setSelectedWorker(null)}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
                    <Text style={styles.backButtonText}>All Workers</Text>
                </TouchableOpacity>

                <View style={{alignItems: 'center', marginBottom: theme.spacing(2)}}>
                    <Image source={{ uri: selectedWorker.avatar }} style={[styles.avatar, {width: 80, height: 80, borderRadius: 40}]} />
                    <Text style={[styles.title, {fontSize: 24, marginTop: theme.spacing(1), marginBottom: 0}]}>{selectedWorker.name}'s Activity</Text>
                </View>
                
                <Card style={styles.tableCard}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, {flex: 2}]}>Project</Text>
                        <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'center'}]}>Clock In</Text>
                        <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'center'}]}>Clock Out</Text>
                        <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'center'}]}>Break</Text>
                        <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'right'}]}>Hours</Text>
                    </View>
                    {workerActivities.map((act: Activity, index: number) => (
                        <View key={index} style={styles.tableRow}>
                            <View style={{flex: 2}}>
                                <Text style={styles.projectName}>{act.projName}</Text>
                                {act.notes && <Text style={styles.noteText}>"{act.notes}"</Text>}
                            </View>
                            <Text style={[styles.tableCell, {flex: 1, textAlign: 'center'}]}>{act.in}</Text>
                            <Text style={[styles.tableCell, {flex: 1, textAlign: 'center'}]}>{act.out}</Text>
                            <Text style={[styles.tableCell, {flex: 1, textAlign: 'center'}]}>{act.break}</Text>
                            <Text style={[styles.tableCell, {flex: 1, textAlign: 'right', fontWeight: 'bold'}]}>{act.hours}</Text>
                        </View>
                    ))}
                </Card>

                <Card style={styles.summaryBar}>
                    <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Total Hours</Text><Text style={styles.summaryValue}>{selectedWorker.totalHours}</Text></View>
                    <View style={styles.summarySeparator} />
                    <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Overtime</Text><Text style={[styles.summaryValue, {color: theme.colors.warning}]}>{selectedWorker.overtime}</Text></View>
                    <View style={styles.summarySeparator} />
                    <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Projects</Text><Text style={styles.summaryValue}>{selectedWorker.projectCount}</Text></View>
                </Card>
            </>
        )
    };

  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        {!selectedWorker && <Text style={styles.title}>Daily Detailed Report</Text>}

        <Card style={styles.filterCard}>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.filterLabel}>Date:</Text>
                <CrossPlatformDatePicker date={selectedDate} onDateChange={setDate} />
                <Text style={[styles.filterLabel, {marginLeft: theme.spacing(2)}]}>Project:</Text>
                <Dropdown
                    style={{flex: 1}}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    data={allProjects}
                    maxHeight={300}
                    labelField="label"
                    valueField="value"
                    placeholder="All Projects"
                    value={selectedProject}
                    onChange={item => setSelectedProject(item.value)}
                />
             </View>
        </Card>

        {selectedWorker ? renderDrillDown() : renderOverview()}
        
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.pageBackground },
  scrollContentContainer: { padding: theme.spacing(3) },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.headingText, marginBottom: theme.spacing(3) },
  filterCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
  filterLabel: { fontSize: 16, fontWeight: '500', marginRight: theme.spacing(1), color: theme.colors.bodyText },
  placeholderStyle: { fontSize: 16, color: '#999' },
  selectedTextStyle: { fontSize: 16 },
  workerRowCard: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing(1.5), marginBottom: theme.spacing(1.5) },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: theme.spacing(1.5) },
  workerInfo: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: '600', color: theme.colors.headingText },
  projectCount: { fontSize: 14, color: theme.colors.bodyText },
  workerHours: { alignItems: 'flex-end', marginHorizontal: theme.spacing(1.5) },
  hoursLabel: { fontSize: 12, color: theme.colors.bodyText },
  hoursValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.headingText },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing(3) },
  backButtonText: { fontSize: 18, fontWeight: '600', color: theme.colors.primary, marginLeft: theme.spacing(1) },
  tableCard: { padding: 0, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: theme.colors.borderColor, padding: theme.spacing(1.5), backgroundColor: theme.colors.pageBackground, },
  tableHeaderText: { fontWeight: '600', color: theme.colors.headingText },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.borderColor, padding: theme.spacing(1.5), alignItems: 'center' },
  tableCell: { fontSize: 14, color: theme.colors.bodyText },
  projectName: { fontWeight: '500', color: theme.colors.headingText },
  noteText: { fontSize: 12, color: theme.colors.bodyText, fontStyle: 'italic', marginTop: 2 },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: theme.spacing(2), marginTop: theme.spacing(3) },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: theme.colors.bodyText, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: theme.colors.headingText },
  summarySeparator: { width: 1, height: '80%', backgroundColor: theme.colors.borderColor },
});

export default DailyDetailedReport;