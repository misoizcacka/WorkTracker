import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import moment from 'moment';

import AnimatedScreen from '../../../../components/AnimatedScreen';
import { Card } from '../../../../components/Card';
import CrossPlatformDatePicker from '../../../../components/CrossPlatformDatePicker';
import { theme } from '../../../../theme';
import { supabase } from '../../../../utils/supabase';
import { Ionicons } from '@expo/vector-icons';

interface Worker {
  worker_id: string;
  full_name: string;
  avatar_url: string | null;
}

const DailyDetailedReportPage = () => { // Renamed component
  const router = useRouter();
  const [selectedDate, setDate] = useState(new Date());
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleWorkerPress = (worker: Worker) => {
    const dateString = moment(selectedDate).format('YYYY-MM-DD');
    router.push(`/reports/daily-detailed-report/${worker.worker_id}?date=${dateString}`); // Updated route
  };

  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>Daily Detailed Report</Text>

        <Card style={styles.filterCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.filterLabel}>Date:</Text>
            <CrossPlatformDatePicker date={selectedDate} onDateChange={setDate} />
          </View>
        </Card>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }}/>
        ) : workers.length === 0 ? (
            <Card style={styles.workerRowCard}><Text>No workers with sessions on this date.</Text></Card>
        ) : (
          workers.map(worker => (
            <TouchableOpacity key={worker.worker_id} onPress={() => handleWorkerPress(worker)}>
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
          ))
        )}
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
    workerRowCard: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing(1.5), marginBottom: theme.spacing(1.5) },
    avatar: { width: 48, height: 48, borderRadius: 24, marginRight: theme.spacing(1.5) },
    avatarPlaceholder: {
        backgroundColor: theme.colors.borderColor,
        justifyContent: 'center',
        alignItems: 'center',
    },
    workerInfo: { flex: 1 },
    employeeName: { fontSize: 16, fontWeight: '600', color: theme.colors.headingText },
});

export default DailyDetailedReportPage; // Export renamed component
