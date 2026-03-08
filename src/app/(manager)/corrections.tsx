import { View, StyleSheet, ScrollView, Modal, TextInput, Alert, ActivityIndicator, FlatList, Image, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Text } from '../../components/Themed';
import moment from 'moment';

import AnimatedScreen from '../../components/AnimatedScreen';
import { Card } from '../../components/Card';
import { theme } from '../../theme';
import { EmployeesContext } from '../../context/EmployeesContext';
import { useState, useContext, useMemo, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { WorkSession, Employee } from '~/types';
import ThemedInput from '~/components/ThemedInput';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '~/components/Button';
import UserAvatar from '~/components/UserAvatar';


const CorrectionsPage = () => {
    const { employees } = useContext(EmployeesContext)!;

    const [selectedWorker, setSelectedWorker] = useState<Employee | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(moment().month() + 1); // moment months are 0-indexed
    const [selectedYear, setSelectedYear] = useState(moment().year());
    const [sessions, setSessions] = useState<WorkSession[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
    const [editBreak, setEditBreak] = useState('');
    const [editCorrection, setEditCorrection] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [checkOutLoading, setCheckOutLoading] = useState<string | null>(null);

    const handlePrevMonth = () => {
        const newDate = moment({ year: selectedYear, month: selectedMonth - 1 }).subtract(1, 'month');
        setSelectedYear(newDate.year());
        setSelectedMonth(newDate.month() + 1);
    };

    const handleNextMonth = () => {
        const newDate = moment({ year: selectedYear, month: selectedMonth - 1 }).add(1, 'month');
        setSelectedYear(newDate.year());
        setSelectedMonth(newDate.month() + 1);
    };

    const filteredWorkers = useMemo(() => {
        return employees.filter((employee: Employee) =>
            employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            employee.role === 'worker' // Only show workers
        );
    }, [employees, searchTerm]);

    const fetchSessions = async () => {
        if (!selectedWorker) {
            setSessions([]);
            return;
        }
        setLoading(true);

        const startOfMonth = moment().year(selectedYear).month(selectedMonth - 1).startOf('month').toISOString();
        const endOfMonth = moment().year(selectedYear).month(selectedMonth - 1).endOf('month').toISOString();
        
        const { data, error } = await supabase
            .from('work_sessions')
            .select('*')
            .eq('worker_id', selectedWorker.id)
            .gte('start_time', startOfMonth)
            .lte('start_time', endOfMonth)
            .order('start_time', { ascending: true });
        
        if (error) {
            Alert.alert('Error fetching sessions', error.message);
            setSessions([]);
        } else {
            setSessions(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSessions();
    }, [selectedWorker, selectedMonth, selectedYear]);

    const openEditModal = (session: WorkSession) => {
        setEditingSession(session);
        setEditBreak((session.total_break_minutes || 0).toString());
        setEditCorrection((session.correction_minutes || 0).toString());
        setModalVisible(true);
    };

    const handleCheckOut = async (session: WorkSession) => {
        Alert.alert(
            "Remote Check Out",
            "Are you sure you want to end this worker's session right now?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Check Out", 
                    onPress: async () => {
                        setCheckOutLoading(session.id);
                        try {
                            const { error } = await supabase
                                .from('work_sessions')
                                .update({ end_time: new Date().toISOString() })
                                .eq('id', session.id);

                            if (error) throw error;
                            Alert.alert("Success", "Worker has been checked out.");
                            fetchSessions();
                        } catch (err: any) {
                            Alert.alert("Error", err.message);
                        } finally {
                            setCheckOutLoading(null);
                        }
                    }
                }
            ]
        );
    };

    const handleSaveChanges = async () => {
        if (!editingSession) return;
        setIsSaving(true);

        try {
            const { error } = await supabase
                .from('work_sessions')
                .update({
                    total_break_minutes: parseInt(editBreak) || 0,
                    correction_minutes: parseInt(editCorrection) || 0,
                })
                .eq('id', editingSession.id);

            if (error) throw error;
            
            Alert.alert('Success', 'Work session updated.');
            setModalVisible(false);
            fetchSessions();
        } catch (error: any) {
            Alert.alert('Error updating session', error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const _renderWorkerItem = ({ item }: { item: Employee }) => {
        const isSelected = selectedWorker?.id === item.id;
        const itemNameColor = isSelected ? theme.colors.primary : styles.itemName.color;
        const itemSubtitleColor = isSelected ? theme.colors.bodyText : styles.itemSubtitle.color;

        return (
            <TouchableOpacity onPress={() => setSelectedWorker(item)} style={styles.listItem}>
                <View style={[styles.itemContent, isSelected && styles.selectedItem]}>
                    <UserAvatar avatarUrl={item.avatar_url} size={40} style={styles.avatar} />
                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, { color: itemNameColor }]} fontType="medium">{item.full_name}</Text>
                        <Text style={[styles.itemSubtitle, { color: itemSubtitleColor }]} fontType="regular">{item.email}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
                </View>
            </TouchableOpacity>
        );
    };

    const SessionTableHeader = () => (
        <View style={styles.tableHeaderRow}>
            <Text style={styles.tableHeaderCell} fontType="bold">Date</Text>
            <Text style={styles.tableHeaderCell} fontType="bold">Time</Text>
            <Text style={styles.tableHeaderCell} fontType="bold">Break/Corr</Text>
            <Text style={styles.tableHeaderCellActions}></Text>
        </View>
    );

    return (
        <AnimatedScreen>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle} fontType="bold">Corrections</Text>
            <Text style={styles.pageSubtitle}>Adjust recorded work sessions for your team.</Text>
          </View>
            <View style={styles.mainContentCard}>
                
                <View style={styles.mainLayout}>
                    <View style={styles.leftPanel}>
                        <Text style={styles.panelTitle} fontType="medium">Workers</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search workers..."
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            placeholderTextColor="#999"
                        />
                        <FlatList
                            data={filteredWorkers}
                            renderItem={_renderWorkerItem}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.workerListContent}
                        />
                    </View>

                    <View style={styles.rightPanel}>
                        <View style={styles.sessionHeaderControls}>
                            <View style={styles.monthNavigator}>
                                <TouchableOpacity style={styles.monthNavButton} onPress={handlePrevMonth}>
                                    <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.monthDisplayText} fontType="bold">
                                    {moment({ year: selectedYear, month: selectedMonth - 1 }).format('MMMM YYYY')}
                                </Text>
                                <TouchableOpacity style={styles.monthNavButton} onPress={handleNextMonth}>
                                    <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Card style={styles.tableWrapperCard}>
                            {selectedWorker === null ? (
                                <View style={styles.noSessionsContainer}>
                                    <Text style={styles.noSessionsText} fontType="regular">Please select a worker to view sessions.</Text>
                                </View>
                            ) : loading ? (
                                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }}/>
                            ) : sessions.length === 0 ? (
                                <View style={styles.noSessionsContainer}>
                                    <Text style={styles.noSessionsText} fontType="regular">No sessions found for this month.</Text>
                                </View>
                            ) : (
                                <>
                                    <SessionTableHeader />
                                    <ScrollView contentContainerStyle={styles.sessionsListContent}>
                                        {sessions.map((session: WorkSession) => {
                                            const isActive = !session.end_time;
                                            return (
                                                <View key={session.id} style={styles.tableRow}>
                                                    <View style={styles.tableCell}>
                                                        <Text style={styles.tableCellTextMain} fontType="medium">{moment(session.start_time).format('MMM D, YYYY')}</Text>
                                                    </View>
                                                    <View style={styles.tableCell}>
                                                        <Text style={styles.tableCellTextSmall} fontType="regular">
                                                            {moment(session.start_time).format('HH:mm')} - {session.end_time ? moment(session.end_time).format('HH:mm') : '...'}
                                                        </Text>
                                                        {isActive && (
                                                            <View style={styles.activeBadge}>
                                                                <Text style={styles.activeBadgeText} fontType="bold">ACTIVE</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <View style={styles.tableCell}>
                                                        <Text style={styles.tableCellTextSmall} fontType="regular">Break: {session.total_break_minutes}m</Text>
                                                        <Text style={[styles.tableCellTextSmall, { color: session.correction_minutes >= 0 ? theme.colors.success : theme.colors.danger }]} fontType="medium">
                                                            Corr: {session.correction_minutes >= 0 ? '+' : ''}{session.correction_minutes}m
                                                        </Text>
                                                    </View>
                                                    <View style={styles.tableCellActions}>
                                                        {isActive ? (
                                                            <TouchableOpacity onPress={() => handleCheckOut(session)} disabled={!!checkOutLoading}>
                                                                {checkOutLoading === session.id ? (
                                                                    <ActivityIndicator size="small" color={theme.colors.danger} />
                                                                ) : (
                                                                    <View style={styles.checkOutButton}>
                                                                        <Ionicons name="log-out-outline" size={20} color="white" />
                                                                        <Text style={styles.checkOutButtonText} fontType="bold">END</Text>
                                                                    </View>
                                                                )}
                                                            </TouchableOpacity>
                                                        ) : (
                                                            <TouchableOpacity onPress={() => openEditModal(session)} style={styles.actionButton}>
                                                                <Ionicons name="pencil-outline" size={22} color={theme.colors.primary} />
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </ScrollView>
                                </>
                            )}
                        </Card>
                    </View>
                </View>

                {/* Modal for editing session */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={isModalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.centeredView}>
                        <Card style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle} fontType="bold">Adjust Work Session</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.bodyText} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.sessionSummary}>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel} fontType="medium">Original Time</Text>
                                    <Text style={styles.summaryValue} fontType="bold">
                                        {moment(editingSession?.start_time).format('HH:mm')} - {editingSession?.end_time ? moment(editingSession?.end_time).format('HH:mm') : 'Active'}
                                    </Text>
                                </View>
                            </View>
                            
                            <View style={styles.fieldRow}>
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label} fontType="bold">Break Minutes</Text>
                                    <ThemedInput
                                        style={styles.modalInput}
                                        value={editBreak}
                                        onChangeText={setEditBreak}
                                        keyboardType="numeric"
                                        placeholder="e.g. 30"
                                    />
                                    <Text style={styles.fieldHint}>Time excluded from work duration.</Text>
                                </View>
                            </View>

                            <View style={styles.fieldRow}>
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label} fontType="bold">Correction Minutes</Text>
                                    <ThemedInput
                                        style={styles.modalInput}
                                        value={editCorrection}
                                        onChangeText={setEditCorrection}
                                        keyboardType="numbers-and-punctuation"
                                        placeholder="e.g. 15 or -15"
                                    />
                                    <Text style={styles.fieldHint}>Add (+) or subtract (-) time for payroll.</Text>
                                </View>
                            </View>

                            <View style={styles.modalFooter}>
                                <Button 
                                    onPress={handleSaveChanges} 
                                    style={styles.saveButton}
                                    disabled={isSaving}
                                    loading={isSaving}
                                    title="Save Adjustments"
                                />
                            </View>
                        </Card>
                    </View>
                </Modal>
            </View>
        </AnimatedScreen>
    );
};

const styles = StyleSheet.create({
    mainContentCard: {
        flex: 1,
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        padding: theme.spacing(2),
        marginHorizontal: theme.spacing(2),
        marginBottom: theme.spacing(2),
        ...Platform.select({
          web: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
          },
          native: { elevation: 6 },
        }),
    },
    pageHeader: {
        paddingVertical: theme.spacing(4),
        paddingHorizontal: theme.spacing(2),
        backgroundColor: theme.colors.background,
        alignItems: 'flex-start',
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
    mainLayout: { flex: 1, flexDirection: 'row' },
    leftPanel: {
        width: 280,
        backgroundColor: theme.colors.cardBackground,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.borderColor,
        padding: theme.spacing(2),
    },
    rightPanel: {
        flex: 1,
        backgroundColor: theme.colors.cardBackground,
        padding: theme.spacing(2),
    },
    panelTitle: {
        fontSize: theme.fontSizes.lg,
        color: theme.colors.headingText,
        marginBottom: theme.spacing(2),
    },
    searchInput: {
        height: theme.spacing(5),
        borderColor: theme.colors.borderColor,
        borderWidth: 1,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing(2),
        marginBottom: theme.spacing(2),
        backgroundColor: theme.colors.pageBackground,
        color: theme.colors.headingText,
    },
    workerListContent: { paddingBottom: theme.spacing(2) },
    listItem: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.borderColor,
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing(1.5),
        borderRadius: theme.radius.md,
        flex: 1,
    },
    selectedItem: { backgroundColor: theme.colors.primaryMuted },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: theme.spacing(2) },
    itemInfo: { flex: 1 },
    itemName: { color: theme.colors.headingText },
    itemSubtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.bodyText },
    sessionHeaderControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing(2),
    },
    monthNavigator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.pageBackground,
        borderRadius: theme.radius.lg,
        paddingVertical: theme.spacing(0.5),
        paddingHorizontal: theme.spacing(1.5),
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
    },
    monthNavButton: { padding: theme.spacing(1) },
    monthDisplayText: {
        fontSize: theme.fontSizes.md,
        color: theme.colors.headingText,
        marginHorizontal: theme.spacing(1.5),
        width: 160,
        textAlign: 'center',
    },
    tableWrapperCard: { flex: 1, overflow: 'hidden' },
    noSessionsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing(2),
    },
    noSessionsText: { fontSize: theme.fontSizes.md, color: theme.colors.bodyText, textAlign: 'center' },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.pageBackground,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderColor,
    },
    tableHeaderCell: {
        padding: theme.spacing(2),
        color: theme.colors.bodyText,
        textAlign: 'center',
        flex: 1,
        fontSize: theme.fontSizes.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    tableHeaderCellActions: { width: 100, padding: theme.spacing(2) },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderColor,
        backgroundColor: theme.colors.cardBackground,
        paddingVertical: theme.spacing(1),
    },
    tableCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tableCellTextMain: { color: theme.colors.headingText, fontSize: 15 },
    tableCellTextSmall: { color: theme.colors.bodyText, fontSize: 13, marginTop: 2 },
    tableCellActions: { width: 100, alignItems: 'center', justifyContent: 'center' },
    sessionsListContent: { paddingBottom: theme.spacing(1) },
    activeBadge: {
        backgroundColor: theme.colors.success + '20',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
    },
    activeBadgeText: { color: theme.colors.success, fontSize: 10, letterSpacing: 0.5 },
    checkOutButton: {
        backgroundColor: theme.colors.danger,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.radius.md,
    },
    checkOutButtonText: { color: 'white', fontSize: 11, marginLeft: 4 },
    actionButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.pageBackground,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modalCard: {
        width: '90%',
        maxWidth: 450,
        padding: 0,
        borderRadius: theme.radius.xl,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing(3),
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderColor,
    },
    modalTitle: { fontSize: 18, color: theme.colors.headingText },
    sessionSummary: {
        backgroundColor: theme.colors.pageBackground,
        padding: theme.spacing(2),
        margin: theme.spacing(3),
        borderRadius: theme.radius.lg,
    },
    summaryLabel: { fontSize: 12, color: theme.colors.bodyText, textTransform: 'uppercase' },
    summaryValue: { fontSize: 16, color: theme.colors.headingText, marginTop: 4 },
    fieldRow: { paddingHorizontal: theme.spacing(3), marginBottom: theme.spacing(3) },
    fieldContainer: { width: '100%' },
    label: { fontSize: 14, color: theme.colors.bodyText, marginBottom: 8 },
    modalInput: { height: 50, backgroundColor: theme.colors.pageBackground, borderRadius: theme.radius.md },
    fieldHint: { fontSize: 12, color: theme.colors.disabledText, marginTop: 6 },
    modalFooter: {
        padding: theme.spacing(3),
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderColor,
    },
    saveButton: { height: 52, backgroundColor: theme.colors.primary },
});

export default CorrectionsPage;
