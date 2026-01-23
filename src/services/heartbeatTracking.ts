import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCATION_HEARTBEAT_TASK } from '../tasks/locationHeartbeatTask';

const fifteenMinutesInMs = 15 * 60 * 1000;

export async function startHeartbeatTracking(assignmentId: string, companyId: string, workerId: string) {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.error('Foreground location permission not granted');
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.error('Background location permission not granted');
      return;
    }

    await AsyncStorage.setItem('currentAssignmentId', assignmentId);
    await AsyncStorage.setItem('currentCompanyId', companyId);
    await AsyncStorage.setItem('currentWorkerId', workerId);


    await Location.startLocationUpdatesAsync(LOCATION_HEARTBEAT_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: fifteenMinutesInMs,
      distanceInterval: 0,
      deferredUpdatesInterval: fifteenMinutesInMs,
      deferredUpdatesDistance: 0,
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: true,
    });

    console.log('Started background location updates for heartbeat.');
  } catch (error) {
    console.error('Error starting heartbeat tracking:', error);
  }
}

export async function stopHeartbeatTracking() {
  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_HEARTBEAT_TASK);
    if(isTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_HEARTBEAT_TASK);
        console.log('Stopped background location updates for heartbeat.');
    }
    await AsyncStorage.removeItem('currentAssignmentId');
    await AsyncStorage.removeItem('currentCompanyId');
    await AsyncStorage.removeItem('currentWorkerId');

  } catch (error) {
    console.error('Error stopping heartbeat tracking:', error);
  }
}
