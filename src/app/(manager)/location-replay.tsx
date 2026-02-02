import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Text } from '~/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import moment from 'moment';

import AnimatedScreen from '~/components/AnimatedScreen';
import LocationReplayWorkerSelector from '~/app/(manager)/components/LocationReplayWorkerSelector';
import LocationReplayMapOnlyPanel from '~/app/(manager)/components/LocationReplayMapOnlyPanel';
import { theme } from '~/theme';

const { width } = Dimensions.get('window');
const isLargeScreen = width >= 900;

const LocationReplayPage = () => {
  const router = useRouter();
  const { worker_id, date } = useLocalSearchParams(); // Get worker_id and date from URL parameters

  const [selectedWorkerId, setSelectedWorkerId] = useState<string | undefined>(
    typeof worker_id === 'string' ? worker_id : undefined
  );
  const [selectedDate, setSelectedDate] = useState<Date>(
    typeof date === 'string' ? moment(date).toDate() : new Date()
  );

  useEffect(() => {
    // Update state if URL params change externally
    if (typeof worker_id === 'string' && worker_id !== selectedWorkerId) {
      setSelectedWorkerId(worker_id);
    }
    if (typeof date === 'string' && moment(date).toDate().getTime() !== selectedDate.getTime()) {
      setSelectedDate(moment(date).toDate());
    }
  }, [worker_id, date]);

  const handleSelectionChange = (newWorkerId: string | undefined, newDate: Date) => {
    setSelectedWorkerId(newWorkerId);
    setSelectedDate(newDate);

    // Update URL parameters to reflect the selection
    if (newWorkerId) {
        router.replace({
            pathname: `/location-replay`, // Keep on the same page
            params: { worker_id: newWorkerId, date: moment(newDate).format('YYYY-MM-DD') },
        });
    } else {
        // If no worker is selected, clear worker_id from URL
        router.replace({
            pathname: `/location-replay`,
            params: { date: moment(newDate).format('YYYY-MM-DD') },
        });
    }
  };

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle} fontType="bold">Location Replay</Text>
        <Text style={styles.pageSubtitle}>Review historical worker locations.</Text>
      </View>
      <View style={styles.mainContentCard}>
        <View style={styles.mainLayout}>
          {isLargeScreen && (
            <View style={styles.leftPanel}>
              <LocationReplayWorkerSelector
                onSelectionChange={handleSelectionChange}
                initialDate={selectedDate}
                initialWorkerId={selectedWorkerId}
              />
            </View>
          )}
          <View style={styles.rightPanel}>
            <LocationReplayMapOnlyPanel workerId={selectedWorkerId} date={selectedDate} />
          </View>
        </View>
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
  mainLayout: {
    flex: 1,
    flexDirection: 'row', // For side-by-side panels
  },
  leftPanel: {
    width: 300, // Fixed width for the worker selector panel
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.colors.borderColor,
    paddingRight: theme.spacing(2),
  },
  rightPanel: {
    flex: 1, // Take up remaining space
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
});

export default LocationReplayPage;