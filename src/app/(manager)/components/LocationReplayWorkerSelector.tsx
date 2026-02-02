import React, { useState, useContext, useMemo, useEffect } from 'react';
import { View, StyleSheet, Image, TextInput, FlatList, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Text } from '~/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

import { useSession } from '~/context/AuthContext';
import { EmployeesContext, EmployeesContextType } from '~/context/EmployeesContext';
import { theme } from '~/theme';
import CrossPlatformDatePicker from '~/components/CrossPlatformDatePicker';
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

    useEffect(() => {
        // When initialWorkerId or initialDate changes from props, update internal state
        if (initialWorkerId && initialWorkerId !== selectedWorkerId) {
            setSelectedWorkerId(initialWorkerId);
        }
        if (initialDate && initialDate.getTime() !== selectedDate.getTime()) {
            setSelectedDate(initialDate);
        }
    }, [initialWorkerId, initialDate, selectedWorkerId, selectedDate]); // Add selectedWorkerId, selectedDate to dependencies

    useEffect(() => {
        // Emit initial selection if available
        if (selectedWorkerId) {
            onSelectionChange(selectedWorkerId, selectedDate);
        }
    }, []); // Run only once on mount

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
        const iconColor = isSelected ? theme.colors.primary : theme.colors.bodyText;
        const checkmarkColor = isSelected ? theme.colors.primary : theme.colors.primary;

        return (
            <TouchableOpacity onPress={() => handleWorkerPress(item)} style={styles.listItem}>
                <View style={[styles.itemContent, isSelected && styles.selectedItem]}>
                    {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                    ) : (
                        <Ionicons name="person" size={40} color={iconColor} style={styles.avatarPlaceholder} />
                    )}
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName} fontType="medium">{item.full_name}</Text>
                        {/* Assuming worker object from RPC has an email, if needed */}
                        {/* <Text style={styles.itemSubtitle}>{item.email}</Text> */}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={checkmarkColor} />}
                </View>
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
        fontSize: 12,
        color: theme.colors.bodyText,
    },
    noWorkersText: {
        textAlign: 'center',
        marginTop: theme.spacing(3),
        color: theme.colors.bodyText,
        fontSize: theme.fontSizes.md,
    }
});

export default LocationReplayWorkerSelector;