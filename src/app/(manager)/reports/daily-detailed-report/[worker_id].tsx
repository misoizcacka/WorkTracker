import React from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native'; // Added View, TouchableOpacity, Platform
import { useLocalSearchParams, useRouter } from 'expo-router'; // Added useRouter
import moment from 'moment';

import AnimatedScreen from '~/components/AnimatedScreen';
import WorkerDailyDetailsPanel from '~/app/(manager)/components/WorkerDailyDetailsPanel'; // The component with summary, timeline, map
import { Ionicons } from '@expo/vector-icons'; // Added Ionicons
import { theme } from '~/theme'; // Added theme
import { Text } from '~/components/Themed'; // Added Text

const DailyDetailedReportPage = () => {
  const router = useRouter(); // Initialize useRouter
  const { worker_id, date } = useLocalSearchParams<{ worker_id: string; date: string }>();

  // Ensure worker_id is a string and date is a valid Date object
  const validWorkerId = typeof worker_id === 'string' ? worker_id : undefined;
  const validDate = typeof date === 'string' ? moment(date).toDate() : new Date();

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.headingText} />
        </TouchableOpacity>
        <View>
            <Text style={styles.pageTitle} fontType="bold">Daily Detailed Report</Text>
            <Text style={styles.pageSubtitle}>View a detailed breakdown of a worker's day.</Text>
        </View>
      </View>
      <View style={styles.mainContentCard}>
        <WorkerDailyDetailsPanel workerId={validWorkerId} date={validDate} />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.background,
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
});

export default DailyDetailedReportPage;