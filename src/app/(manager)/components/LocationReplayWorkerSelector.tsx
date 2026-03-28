import React, { useState, useContext, useMemo, useEffect } from 'react';
import { View, StyleSheet, Image, TextInput, FlatList, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Text } from '~/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

import { useSession } from '~/context/AuthContext';
import { EmployeesContext, EmployeesContextType } from '~/context/EmployeesContext';
import { theme } from '~/theme';
import CrossPlatformDatePicker from '~/components/CrossPlatformDatePicker';
import UserAvatar from '~/components/UserAvatar';
import { supabase } from '~/utils/supabase'; // Import supabase

import { Employee } from '~/types'; // Assuming Employee type is accessible

interface Worker { // Defined here for local use
  worker_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface LocationReplayWorkerSelectorProps {
    onSelectionChange: (workerId: string | undefined, date: Date) => void;
    initialWorkerId?: string;
    initialDate?: Date;
}

const LocationReplayWorkerSelector = ({ onSelectionChange, initialWorkerId, initialDate }: LocationReplayWorkerSelectorProps) => {
    const { user } = useSession();
    const { employees } = useContext(EmployeesContext) as EmployeesContextType;

    const [searchTerm, setSearchTerm] = useState('');
    const [workers, setWorkers] = useState<Worker[]>([]); // State to hold workers with sessions
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | undefined>(initialWorkerId);
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
    const [loadingWorkers, setLoadingWorkers] = useState(false); // Loading state for worker fetching

    // Effect to fetch workers based on selectedDate
    useEffect(() => {
        const fetchWorkersWithSessions = async () => {
            setLoadingWorkers(true);
            const dateString = moment(selectedDate).format('YYYY-MM-DD');
            const { data, error } = await supabase.rpc('get_workers_with_sessions_for_date', {
                report_date: dateString,
            });

            if (error) {
                console.error('Error fetching workers with sessions:', error);
                setWorkers([]);
            } else {
                setWorkers(data || []);
            }
            setLoadingWorkers(false);
        };

        fetchWorkersWithSessions();
    }, [selectedDate]);

    // Filter workers based on search term
    const filteredWorkers = useMemo(() => {
        // Filter the 'workers' (those with sessions) based on the search term
        return workers.filter((worker: Worker) =>
            worker.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [workers, searchTerm]);

    const employeeEmailById = useMemo(() => {
        return new Map(employees.map((employee: Employee) => [employee.id, employee.email]));
    }, [employees]);

    useEffect(() => {
        // When initialWorkerId or initialDate changes from props, update internal state
        // Only update if they actually differ to avoid infinite loops
        if (initialWorkerId !== undefined && initialWorkerId !== selectedWorkerId) {
            setSelectedWorkerId(initialWorkerId);
        }
        if (initialDate !== undefined && initialDate.getTime() !== selectedDate.getTime()) {
            setSelectedDate(initialDate);
        }
    }, [initialWorkerId, initialDate]); // Removed selectedWorkerId and selectedDate from deps

    const handleWorkerPress = (worker: Worker) => {
        setSelectedWorkerId(worker.worker_id);
        onSelectionChange(worker.worker_id, selectedDate);
    };

    const handleDateChange = (newDate: Date) => {
        setSelectedDate(newDate);
        onSelectionChange(selectedWorkerId, newDate);
    };

    const renderWorkerItem = ({ item }: { item: Worker }) => { // Changed type to Worker
        const isSelected = selectedWorkerId === item.worker_id; // Changed to item.worker_id
        const email = employeeEmailById.get(item.worker_id);

        return (
            <TouchableOpacity onPress={() => handleWorkerPress(item)} style={[styles.workerItem, isSelected && styles.selectedWorkerItem]}>
                    <Ionicons
                        name={isSelected ? "checkbox" : "square-outline"}
                        size={20}
                        color={isSelected ? theme.colors.primary : theme.colors.bodyText}
                        style={styles.workerIcon}
                    />
                    <UserAvatar avatarUrl={item.avatar_url} size={40} style={styles.avatar} />
                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, isSelected && styles.selectedWorkerText]} fontType="medium">{item.full_name}</Text>
                        {!!email && <Text style={styles.itemSubtitle} fontType="regular">{email}</Text>}
                    </View>
                    {isSelected && <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.panelTitle} fontType="medium">Workers</Text>
            
            <View style={styles.datePickerContainer}>
                <Text style={styles.datePickerLabel} fontType="medium">Date:</Text>
                <CrossPlatformDatePicker
                    date={selectedDate}
                    onDateChange={handleDateChange}
                    mode="date"
                />
            </View>
            {loadingWorkers && (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: theme.spacing(2) }}/>
            )}

            <TextInput
                style={styles.searchInput}
                placeholder="Search workers..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor="#999"
            />
            {workers.length === 0 && !loadingWorkers ? (
                <Text style={styles.noWorkersText} fontType="regular">No workers with sessions on this date.</Text>
            ) : (
                <FlatList
                    data={filteredWorkers}
                    renderItem={renderWorkerItem}
                    keyExtractor={item => item.worker_id} // Changed to item.worker_id
                    contentContainerStyle={styles.workerListContent}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.cardBackground,
        padding: theme.spacing(2),
    },
    panelTitle: {
        fontSize: theme.fontSizes.lg,
        color: theme.colors.headingText,
        marginBottom: theme.spacing(2),
    },
    datePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
    },
    datePickerLabel: {
        fontSize: 16,
        marginRight: theme.spacing(1),
        color: theme.colors.bodyText,
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
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: theme.spacing(1.5),
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
    selectedWorkerText: {
        color: theme.colors.primary,
    },
    itemSubtitle: {
        fontSize: 11,
        color: theme.colors.bodyText,
        marginTop: 2,
    },
    noWorkersText: {
        textAlign: 'center',
        marginTop: theme.spacing(3),
        color: theme.colors.bodyText,
        fontSize: theme.fontSizes.md,
    }
});

export default LocationReplayWorkerSelector;
