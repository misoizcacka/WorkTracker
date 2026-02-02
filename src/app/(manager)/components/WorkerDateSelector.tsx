import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import moment from 'moment';

import { Card } from '~/components/Card';
import CrossPlatformDatePicker from '~/components/CrossPlatformDatePicker';
import { theme } from '~/theme';
import { supabase } from '~/utils/supabase';
import { Ionicons } from '@expo/vector-icons';

interface Worker {
  worker_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface WorkerDateSelectorProps {
  onWorkerSelect: (workerId: string, date: Date) => void;
  initialDate?: Date;
  initialWorkerId?: string;
}

const WorkerDateSelector = ({ onWorkerSelect, initialDate, initialWorkerId }: WorkerDateSelectorProps) => {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeWorkerId, setActiveWorkerId] = useState<string | undefined>(initialWorkerId);

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      const dateString = moment(selectedDate).format('YYYY-MM-DD');
      const { data, error } = await supabase.rpc('get_workers_with_sessions_for_date', {
        report_date: dateString,
      });

      if (error) {
        console.error('Error fetching workers:', error);
        setWorkers([]);
      } else {
        setWorkers(data || []);
      }
      setLoading(false);
    };

    fetchWorkers();
  }, [selectedDate]);

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
    // Optionally trigger onWorkerSelect with the new date but keep current worker if any
    if (activeWorkerId) {
        onWorkerSelect(activeWorkerId, newDate);
    }
  };

  const handleWorkerPress = (worker: Worker) => {
    setActiveWorkerId(worker.worker_id);
    onWorkerSelect(worker.worker_id, selectedDate);
  };

  return (
    <View style={styles.container}>
      <Card style={styles.filterCard}>
        <Text style={styles.filterLabel}>Date:</Text>
        <CrossPlatformDatePicker date={selectedDate} onDateChange={handleDateChange} />
      </Card>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }}/>
      ) : workers.length === 0 ? (
          <Card style={styles.workerRowCard}><Text>No workers with sessions on this date.</Text></Card>
      ) : (
        <ScrollView>
          {workers.map(worker => (
            <TouchableOpacity 
                key={worker.worker_id} 
                onPress={() => handleWorkerPress(worker)}
                style={[
                    styles.workerRowTouch, 
                    activeWorkerId === worker.worker_id && styles.activeWorkerRow
                ]}
            >
              <Card style={styles.workerRowCard}>
                {worker.avatar_url ? (
                  <Image source={{ uri: worker.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={24} color={theme.colors.bodyText} />
                  </View>
                )}
                <View style={styles.workerInfo}>
                  <Text style={styles.employeeName}>{worker.full_name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: theme.spacing(2), backgroundColor: theme.colors.pageBackground },
    filterCard: { padding: theme.spacing(2), marginBottom: theme.spacing(3) },
    filterLabel: { fontSize: 16, fontWeight: '500', marginRight: theme.spacing(1), color: theme.colors.bodyText },
    workerRowTouch: {
        marginBottom: theme.spacing(1.5),
        borderRadius: theme.radius.md,
        overflow: 'hidden',
    },
    activeWorkerRow: {
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    workerRowCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: theme.spacing(1.5), 
        backgroundColor: theme.colors.cardBackground 
    },
    avatar: { width: 48, height: 48, borderRadius: 24, marginRight: theme.spacing(1.5) },
    avatarPlaceholder: {
        backgroundColor: theme.colors.borderColor,
        justifyContent: 'center',
        alignItems: 'center',
    },
    workerInfo: { flex: 1 },
    employeeName: { fontSize: 16, fontWeight: '600', color: theme.colors.headingText },
});

export default WorkerDateSelector;