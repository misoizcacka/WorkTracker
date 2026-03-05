import React, { useState, useMemo, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Text } from '../../../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { useRouter } from 'expo-router';

import AnimatedScreen from '../../../components/AnimatedScreen';
import { theme } from '../../../theme';
import { EmployeesContext, EmployeesContextType } from '../../../context/EmployeesContext';
import CrossPlatformDatePicker from '../../../components/CrossPlatformDatePicker';
import { useSession } from '~/context/AuthContext';
import WorkerDailyDetailsPanel from '../components/WorkerDailyDetailsPanel';

const DailyDetailedReport = () => {
    const router = useRouter();
    const { user } = useSession();
    const { employees } = useContext(EmployeesContext) as EmployeesContextType;

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter out managers, guests, and the current user from the employee list
    const availableWorkers = useMemo(() => {
        return employees.filter(emp => 
            emp.role === 'worker' && 
            emp.id !== user?.id &&
            emp.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [employees, user?.id, searchTerm]);

    const renderWorkerItem = ({ item }: { item: any }) => {
        const isSelected = selectedWorkerId === item.id;
        return (
            <TouchableOpacity
                style={[styles.workerItem, isSelected && styles.selectedWorkerItem]}
                onPress={() => setSelectedWorkerId(item.id)}
            >
                <Ionicons
                    name={isSelected ? "person" : "person-outline"}
                    size={20}
                    color={isSelected ? theme.colors.primary : theme.colors.bodyText}
                    style={styles.workerIcon}
                />
                <View style={styles.workerInfo}>
                    <Text style={[styles.workerName, isSelected && styles.selectedWorkerText]} fontType="medium" numberOfLines={1}>
                        {item.full_name}
                    </Text>
                </View>
                {isSelected && <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />}
            </TouchableOpacity>
        );
    };

    return (
        <AnimatedScreen>
            <View style={styles.pageHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.headingText} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.pageTitle} fontType="bold">Daily Detailed Report</Text>
                    <Text style={styles.pageSubtitle}>View a detailed, chronological breakdown of each worker's day.</Text>
                </View>
            </View>

            <View style={styles.mainContentCard}>
                <View style={styles.mainLayout}>
                    {/* --- Left Panel: Worker & Date Selection --- */}
                    <View style={styles.leftPanel}>
                        <Text style={styles.panelTitle} fontType="bold">Select Date</Text>
                        <View style={styles.datePickerContainer}>
                            <CrossPlatformDatePicker
                                date={selectedDate}
                                onDateChange={setSelectedDate}
                                mode="date"
                            />
                        </View>

                        <Text style={[styles.panelTitle, { marginTop: theme.spacing(3) }]} fontType="bold">Select Worker</Text>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search-outline" size={18} color={theme.colors.bodyText} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search workers..."
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                                placeholderTextColor={theme.colors.bodyText}
                            />
                        </View>

                        <FlatList
                            data={availableWorkers}
                            renderItem={renderWorkerItem}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.workerListContent}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>

                    {/* --- Right Panel: Report Details --- */}
                    <View style={styles.rightPanel}>
                        {selectedWorkerId ? (
                             <WorkerDailyDetailsPanel workerId={selectedWorkerId} date={selectedDate} />
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="analytics-outline" size={64} color={theme.colors.borderColor} />
                                <Text style={styles.emptyStateText} fontType="regular">Select a worker and date from the left panel to view their detailed daily activity.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </AnimatedScreen>
    );
};

const styles = StyleSheet.create({
    pageHeader: {
        paddingVertical: theme.spacing(4),
        paddingHorizontal: theme.spacing(2),
        backgroundColor: theme.colors.background,
        flexDirection: 'row',
        alignItems: 'center',
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
    mainContentCard: {
        flex: 1,
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        marginHorizontal: theme.spacing(2),
        marginBottom: theme.spacing(2),
        overflow: 'hidden',
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
    mainLayout: {
        flex: 1,
        flexDirection: 'row',
    },
    leftPanel: {
        width: 300,
        borderRightWidth: 1,
        borderColor: theme.colors.borderColor,
        backgroundColor: theme.colors.background,
        padding: theme.spacing(2),
    },
    panelTitle: {
        fontSize: theme.fontSizes.md,
        color: theme.colors.headingText,
        marginBottom: theme.spacing(1.5),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    datePickerContainer: {
        backgroundColor: theme.colors.pageBackground,
        borderRadius: theme.radius.md,
        padding: theme.spacing(1.5),
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.pageBackground,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        paddingHorizontal: theme.spacing(1),
        marginBottom: theme.spacing(2),
    },
    searchIcon: {
        marginRight: theme.spacing(0.5),
    },
    searchInput: {
        flex: 1,
        height: 40,
        color: theme.colors.headingText,
        fontSize: theme.fontSizes.sm,
    },
    workerListContent: {
        paddingBottom: theme.spacing(2),
    },
    workerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing(1.5),
        borderRadius: theme.radius.md,
        marginBottom: theme.spacing(1),
        backgroundColor: theme.colors.pageBackground,
    },
    selectedWorkerItem: {
        backgroundColor: theme.colors.primaryMuted,
        borderColor: theme.colors.primary,
        borderWidth: 1,
    },
    workerIcon: {
        marginRight: theme.spacing(1.5),
    },
    workerInfo: {
        flex: 1,
    },
    workerName: {
        fontSize: theme.fontSizes.md,
        color: theme.colors.headingText,
    },
    selectedWorkerText: {
        color: theme.colors.primary,
    },
    rightPanel: {
        flex: 1,
        backgroundColor: theme.colors.cardBackground,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: theme.spacing(10),
    },
    emptyStateText: {
        marginTop: theme.spacing(2),
        fontSize: theme.fontSizes.md,
        color: theme.colors.bodyText,
        textAlign: 'center',
        maxWidth: 300,
    },
});

export default DailyDetailedReport;