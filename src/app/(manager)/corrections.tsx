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
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [editBreak, setEditBreak] = useState('');

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
        // Fetch sessions automatically when selectedWorker, month, or year changes
        fetchSessions();
    }, [selectedWorker, selectedMonth, selectedYear]);

    const openEditModal = (session: WorkSession) => {
        setEditingSession(session);
        setEditStartTime(moment(session.start_time).format('HH:mm'));
        setEditEndTime(session.end_time ? moment(session.end_time).format('HH:mm') : '');
        setEditBreak((session.total_break_minutes || 0).toString());
        setModalVisible(true);
    };

    const handleSaveChanges = async () => {
        if (!editingSession) return;

        const sessionDate = moment(editingSession.start_time).format('YYYY-MM-DD'); // Get original session date
        
        const startDateTime = moment(sessionDate).startOf('day').set({
            hour: parseInt(editStartTime.split(':')[0]),
            minute: parseInt(editStartTime.split(':')[1]),
        }).toISOString();
        
        const endDateTime = editEndTime ? moment(sessionDate).startOf('day').set({
            hour: parseInt(editEndTime.split(':')[0]),
            minute: parseInt(editEndTime.split(':')[1]),
        }).toISOString() : null;

        const { error } = await supabase
            .from('work_sessions')
            .update({
                start_time: startDateTime,
                end_time: endDateTime,
                total_break_minutes: parseInt(editBreak) || 0,
            })
            .eq('id', editingSession.id);

        if (error) {
            Alert.alert('Error updating session', error.message);
        } else {
            Alert.alert('Success', 'Work session updated.');
            setModalVisible(false);
            fetchSessions(); // Refresh sessions
        }
    };

    const _renderWorkerItem = ({ item }: { item: Employee }) => {
        const isSelected = selectedWorker?.id === item.id;
        const itemNameColor = isSelected ? theme.colors.primary : styles.itemName.color;
        const itemSubtitleColor = isSelected ? theme.colors.bodyText : styles.itemSubtitle.color;
        const iconColor = isSelected ? theme.colors.primary : theme.colors.bodyText;
        const checkmarkColor = isSelected ? theme.colors.primary : theme.colors.primary;

        return (
            <TouchableOpacity onPress={() => setSelectedWorker(item)} style={styles.listItem}>
                <View style={[styles.itemContent, isSelected && styles.selectedItem]}>
                    {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                    ) : (
                        <Ionicons name="person" size={40} color={iconColor} style={styles.avatarPlaceholder} />
                    )}
                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, { color: itemNameColor }]} fontType="medium">{item.full_name}</Text>
                        <Text style={[styles.itemSubtitle, { color: itemSubtitleColor }]} fontType="regular">{item.email}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={checkmarkColor} />}
                </View>
            </TouchableOpacity>
        );
    };

    const SessionTableHeader = () => (
        <View style={styles.tableHeaderRow}>
            <Text style={styles.tableHeaderCell} fontType="bold">Date</Text>
            <Text style={styles.tableHeaderCell} fontType="bold">Start</Text>
            <Text style={styles.tableHeaderCell} fontType="bold">End</Text>
            <Text style={styles.tableHeaderCell} fontType="bold">Break</Text>
            <Text style={styles.tableHeaderCellActions}></Text> {/* Placeholder for Edit button */}
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
                    {/* Left Panel: Worker List */}
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

                    {/* Right Panel: Work Sessions and Month Selector */}
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
                                        {sessions.map((session: WorkSession) => (
                                            <View key={session.id} style={styles.tableRow}>
                                                <Text style={styles.tableCellText} fontType="regular">{moment(session.start_time).format('MMM D, YYYY')}</Text>
                                                <Text style={styles.tableCellText} fontType="regular">{moment(session.start_time).format('HH:mm')}</Text>
                                                <Text style={styles.tableCellText} fontType="regular">{session.end_time ? moment(session.end_time).format('HH:mm') : 'N/A'}</Text>
                                                <Text style={styles.tableCellText} fontType="regular">{session.total_break_minutes} min</Text>
                                                <View style={styles.tableCellActions}>
                                                    <TouchableOpacity onPress={() => openEditModal(session)}>
                                                        <Ionicons name="pencil-outline" size={24} color={theme.colors.primary} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </>
                            )}
                        </Card>
                    </View>
                </View>

                {/* Modal for editing session */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isModalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                                <Ionicons name="close-circle-outline" size={30} color={theme.colors.bodyText} />
                            </TouchableOpacity>
                            <Text style={styles.modalText} fontType="bold">Edit Session</Text>
                            
                            <View style={styles.fieldRow}>
                                <Text style={styles.label} fontType="medium">Start Time</Text>
                                <ThemedInput
                                    style={styles.input}
                                    value={editStartTime}
                                    onChangeText={setEditStartTime}
                                    placeholder="HH:mm"
                                    placeholderTextColor="#999"
                                />
                            </View>
                            <View style={styles.fieldRow}>
                                <Text style={styles.label} fontType="medium">End Time</Text>
                                <ThemedInput
                                    style={styles.input}
                                    value={editEndTime}
                                    onChangeText={setEditEndTime}
                                    placeholder="HH:mm (Leave empty if active)"
                                    placeholderTextColor="#999"
                                />
                            </View>
                            <View style={styles.fieldRow}>
                                <Text style={styles.label} fontType="medium">Break minutes</Text>
                                <ThemedInput
                                    style={styles.input}
                                    value={editBreak}
                                    onChangeText={setEditBreak}
                                    keyboardType="numeric"
                                    placeholder="Minutes"
                                    placeholderTextColor="#999"
                                />
                            </View>
                            <View style={styles.buttonContainer}>

                                <Button onPress={handleSaveChanges} style={styles.saveButton}>
                                    <Text style={styles.buttonText} fontType="bold">Save Changes</Text>
                                </Button>
                            </View>
                        </View>
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
          native: {
            elevation: 6,
          },
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
    mainLayout: {
        flex: 1,
        flexDirection: 'row',
    },
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
    workerListContent: {
        paddingBottom: theme.spacing(2),
    },
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
    selectedItem: {
        backgroundColor: theme.colors.primaryMuted,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: theme.spacing(2),
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        marginRight: theme.spacing(2),
        textAlign: 'center',
        lineHeight: 40,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        color: theme.colors.headingText,
    },
    itemSubtitle: {
        fontSize: theme.fontSizes.sm,
        color: theme.colors.bodyText,
    },
    sessionHeaderControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Center the new navigator
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
    monthNavButton: {
        padding: theme.spacing(1),
    },
    monthDisplayText: {
        fontSize: theme.fontSizes.md,
        color: theme.colors.headingText,
        marginHorizontal: theme.spacing(1.5),
        width: 160,
        textAlign: 'center',
    },
    placeholderStyle: { fontSize: theme.fontSizes.md, color: theme.colors.bodyText },
    selectedTextStyle: { fontSize: theme.fontSizes.md, color: theme.colors.headingText },
    tableWrapperCard: {
        flex: 1,
        overflow: 'hidden',
    },
    noSessionsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing(2),
    },
    noSessionsText: {
        fontSize: theme.fontSizes.md,
        color: theme.colors.bodyText,
        textAlign: 'center',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderColor,
    },
    tableHeaderCell: {
        padding: theme.spacing(2),
        color: theme.colors.headingText,
        textAlign: 'center',
        flex: 1,
    },
    tableHeaderCellActions: {
        width: 100, // Matching the width for the actions column
        padding: theme.spacing(2),
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderColor,
        backgroundColor: theme.colors.cardBackground,
    },
    tableCellText: {
        padding: theme.spacing(2),
        color: theme.colors.bodyText,
        textAlign: 'center',
        flex: 1,
        fontSize: theme.fontSizes.md,
    },
    tableCellActions: {
        width: 100,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: theme.spacing(1),
    },
    sessionsListContent: {
        paddingBottom: theme.spacing(1), // Ensure content is not cut off at the bottom
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        alignItems: 'stretch',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
        maxWidth: 600,
    },
    modalText: {
        marginBottom: 25,
        textAlign: 'center',
        fontSize: theme.fontSizes.xl,
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 1,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    label: {
        width: 100, // Adjusted width for labels in modal
        fontSize: theme.fontSizes.md,
        color: theme.colors.bodyText,
        marginRight: theme.spacing(1),
    },
    input: {
        flex: 1,
        height: 45,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
        color: theme.colors.headingText,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        borderRadius: 10,
        marginLeft: theme.spacing(1),
    },
    buttonText: {
        color: 'white',
        fontSize: theme.fontSizes.md,
        textAlign: 'center',
    },
});

export default CorrectionsPage;