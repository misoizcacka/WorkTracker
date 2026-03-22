import React, { useState, useEffect, useMemo, useContext } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, FlatList, TouchableOpacity, Image, TextInput, Platform } from 'react-native';
import { Text } from '../../../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { useRouter } from 'expo-router';

import AnimatedScreen from '../../../components/AnimatedScreen';
import { theme } from '../../../theme';
import { EmployeesContext, EmployeesContextType } from '../../../context/EmployeesContext';
import CrossPlatformDatePicker from '../../../components/CrossPlatformDatePicker';
import { supabase } from '../../../utils/supabase';
import { useSession } from '~/context/AuthContext';

interface MonthlyPayrollReportEntry {
    worker_id: string;
    worker_full_name: string;
    total_work_hours: number;
    total_break_minutes: number;
    total_correction_minutes: number;
    payable_hours: number;
}

const EmployeeHoursReport = () => {
    const router = useRouter();
    const { user } = useSession();
    const { employees } = useContext(EmployeesContext) as EmployeesContextType;

    const [startDate, setStartDate] = useState(moment().startOf('month').toDate());
    const [endDate, setEndDate] = useState(moment().endOf('month').toDate());
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [reportData, setReportData] = useState<MonthlyPayrollReportEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter out managers, guests, and the current user from the employee list
    const availableWorkers = useMemo(() => {
        return employees.filter(emp => 
            emp.role === 'worker' && 
            emp.id !== user?.id &&
            emp.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [employees, user?.id, searchTerm]);

    // Effect to fetch report data
    useEffect(() => {
        const fetchReport = async () => {
            if (selectedWorkerIds.length === 0 || !startDate || !endDate) {
                setReportData([]);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase.rpc('get_monthly_payroll_report', {
                p_worker_ids: selectedWorkerIds,
                p_start_date: moment(startDate).format('YYYY-MM-DD'),
                p_end_date: moment(endDate).format('YYYY-MM-DD'),
            });

            if (error) {
                console.error('Error fetching monthly payroll report:', error);
                setReportData([]);
            } else {
                setReportData(data || []);
            }
            setLoading(false);
        };

        fetchReport();
    }, [selectedWorkerIds, startDate, endDate]);

    // Toggle worker selection
    const handleWorkerSelect = (workerId: string) => {
        setSelectedWorkerIds(prev =>
            prev.includes(workerId)
                ? prev.filter(id => id !== workerId)
                : [...prev, workerId]
        );
    };

    const totalHoursAllWorkers = reportData.reduce((sum, entry) => sum + entry.payable_hours, 0);
    const tableMinWidth = 760;

    const renderWorkerItem = ({ item }: { item: any }) => {
        const isSelected = selectedWorkerIds.includes(item.id);
        return (
            <TouchableOpacity
                style={[styles.workerItem, isSelected && styles.selectedWorkerItem]}
                onPress={() => handleWorkerSelect(item.id)}
            >
                <Ionicons
                    name={isSelected ? "checkbox" : "square-outline"}
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
                    <Text style={styles.pageTitle} fontType="bold">Employee Hours Report</Text>
                    <Text style={styles.pageSubtitle}>View and analyze employee work hours for a selected period.</Text>
                </View>
            </View>

            <View style={styles.mainContentCard}>
                <View style={styles.mainLayout}>
                    {/* --- Left Panel: Worker Selection --- */}
                    <View style={styles.leftPanel}>
                        <Text style={styles.panelTitle} fontType="bold">Date Range</Text>
                        <View style={styles.datePickerContainer}>
                            <CrossPlatformDatePicker
                                date={startDate}
                                onDateChange={setStartDate}
                                mode="date"
                            />
                            <View style={styles.dateSeparator}>
                                <Text style={styles.dateSeparatorText} fontType="regular">to</Text>
                            </View>
                            <CrossPlatformDatePicker
                                date={endDate}
                                onDateChange={setEndDate}
                                mode="date"
                            />
                        </View>

                        <Text style={[styles.panelTitle, { marginTop: theme.spacing(3) }]} fontType="bold">Workers</Text>
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
                        {selectedWorkerIds.length > 0 ? (
                            <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
                                {/* --- Report Header Stats --- */}
                                <View style={styles.statsRow}>
                                    <View style={styles.reportHeaderInfo}>
                                        <Text style={styles.reportTitle} fontType="bold">Period Summary</Text>
                                        <Text style={styles.reportPeriod} fontType="regular">
                                            {moment(startDate).format('MMM D, YYYY')} - {moment(endDate).format('MMM D, YYYY')}
                                        </Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel} fontType="bold">Total Payable</Text>
                                        <Text style={styles.statValue} fontType="bold">{totalHoursAllWorkers.toFixed(2)}h</Text>
                                    </View>
                                </View>

                                {/* --- Hours Table --- */}
                                <View style={styles.tableContainer}>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={true}
                                        contentContainerStyle={{ flexGrow: 1 }}
                                    >
                                        <View style={{ minWidth: tableMinWidth, flex: 1 }}>
                                            <View style={styles.tableHeader}>
                                                <View style={[styles.headerCell, styles.colWorker]}>
                                                    <Text style={styles.tableHeaderText} fontType="bold">Worker Name</Text>
                                                </View>
                                                <View style={[styles.headerCell, styles.colHours]}>
                                                    <Text style={[styles.tableHeaderText, styles.numericHeader]} fontType="bold">Worked</Text>
                                                </View>
                                                <View style={[styles.headerCell, styles.colBreaks]}>
                                                    <Text style={[styles.tableHeaderText, styles.numericHeader]} fontType="bold">Break/Corr</Text>
                                                </View>
                                                <View style={[styles.headerCell, styles.colPayable]}>
                                                    <Text style={[styles.tableHeaderText, styles.numericHeader]} fontType="bold">Payable</Text>
                                                </View>
                                            </View>

                                            {loading ? (
                                                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: theme.spacing(4) }} />
                                            ) : reportData.length === 0 ? (
                                                <Text style={styles.noDataText} fontType="regular">No work data found for the selected criteria.</Text>
                                            ) : (
                                        reportData.map((row) => (
                                                    <View key={row.worker_id} style={styles.tableRow}>
                                                        <View style={[styles.tableCell, styles.colWorker]}>
                                                            <Text style={styles.workerCellText} fontType="medium" numberOfLines={1}>
                                                                {row.worker_full_name}
                                                            </Text>
                                                        </View>
                                                        <View style={[styles.tableCell, styles.colHours]}>
                                                            <Text style={styles.tableCellText} fontType="regular">{row.total_work_hours.toFixed(2)}h</Text>
                                                        </View>
                                                        <View style={[styles.tableCell, styles.colBreaks]}>
                                                            <Text style={styles.smallLabel} fontType="regular">B: {row.total_break_minutes}m</Text>
                                                            <Text style={[styles.smallLabel, { color: row.total_correction_minutes >= 0 ? theme.colors.success : theme.colors.danger }]} fontType="medium">
                                                                C: {row.total_correction_minutes >= 0 ? '+' : ''}{row.total_correction_minutes}m
                                                            </Text>
                                                        </View>
                                                        <View style={[styles.tableCell, styles.colPayable]}>
                                                            <View style={styles.hoursBadge}>
                                                                <Text style={styles.hoursBadgeText} fontType="bold">{row.payable_hours.toFixed(2)}h</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                ))
                                            )}
                                        </View>
                                    </ScrollView>
                                </View>
                            </ScrollView>
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={64} color={theme.colors.borderColor} />
                                <Text style={styles.emptyStateText} fontType="regular">Select one or more workers from the list to view their work hours summary.</Text>
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
    dateSeparator: {
        alignItems: 'center',
        marginVertical: theme.spacing(0.5),
    },
    dateSeparatorText: {
        fontSize: theme.fontSizes.xs,
        color: theme.colors.bodyText,
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
    detailsContent: {
        padding: theme.spacing(3),
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.pageBackground,
        borderRadius: theme.radius.lg,
        padding: theme.spacing(2.5),
        marginBottom: theme.spacing(3),
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        alignItems: 'center',
    },
    reportHeaderInfo: {
        flex: 2,
    },
    reportTitle: {
        fontSize: 22,
        color: theme.colors.headingText,
        marginBottom: theme.spacing(0.5),
    },
    reportPeriod: {
        fontSize: theme.fontSizes.md,
        color: theme.colors.bodyText,
    },
    statDivider: {
        width: 1,
        height: '70%',
        backgroundColor: theme.colors.borderColor,
        marginHorizontal: theme.spacing(3),
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: theme.fontSizes.xs,
        color: theme.colors.bodyText,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: theme.spacing(0.5),
    },
    statValue: {
        fontSize: 24,
        color: theme.colors.primary,
    },
    tableContainer: {
        flex: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: theme.colors.pageBackground,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderColor,
        paddingVertical: theme.spacing(2),
        borderTopLeftRadius: theme.radius.md,
        borderTopRightRadius: theme.radius.md,
    },
    headerCell: {
        paddingHorizontal: theme.spacing(2),
        justifyContent: 'center',
    },
    tableHeaderText: {
        fontSize: theme.fontSizes.sm,
        color: theme.colors.headingText,
    },
    numericHeader: {
        textAlign: 'right',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderColor,
        paddingVertical: theme.spacing(2),
    },
    tableCell: {
        paddingHorizontal: theme.spacing(2),
        justifyContent: 'center',
    },
    tableCellText: {
        fontSize: theme.fontSizes.md,
        color: theme.colors.bodyText,
        textAlign: 'right',
    },
    workerCellText: {
        fontSize: theme.fontSizes.md,
        color: theme.colors.bodyText,
    },
    colWorker: {
        flex: 3.2,
    },
    colHours: {
        flex: 1.4,
        alignItems: 'flex-end',
    },
    colBreaks: {
        flex: 1.8,
        alignItems: 'flex-end',
    },
    colPayable: {
        flex: 1.4,
        alignItems: 'flex-end',
    },
    smallLabel: {
        fontSize: 11,
        color: theme.colors.bodyText,
        textAlign: 'right',
    },
    hoursBadge: {
        backgroundColor: theme.colors.primaryMuted,
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: theme.radius.pill,
    },
    hoursBadgeText: {
        color: theme.colors.primary,
        fontSize: theme.fontSizes.md,
    },
    noDataText: {
        textAlign: 'center',
        paddingVertical: theme.spacing(6),
        fontSize: theme.fontSizes.md,
        color: theme.colors.bodyText,
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

export default EmployeeHoursReport;
