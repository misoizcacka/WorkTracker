import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { insertLocationEvent } from '../services/locationEvents';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_HEARTBEAT_TASK = 'location-heartbeat-task';

TaskManager.defineTask(LOCATION_HEARTBEAT_TASK, async ({ data, error }) => {
  if (error) {
    console.error('LOCATION_HEARTBEAT_TASK error:', error);
    return;
  }

  const { locations } = data as { locations: Location.LocationObject[] };

  if (locations && locations.length > 0) {
    const mostRecentLocation = locations[locations.length - 1];
    console.log('Received new location update (heartbeat):', mostRecentLocation);

    try {
      const assignmentId = await AsyncStorage.getItem('currentAssignmentId');
      const companyId = await AsyncStorage.getItem('currentCompanyId');
      const workerId = await AsyncStorage.getItem('currentWorkerId');
      
      if (assignmentId && companyId && workerId) {
        await insertLocationEvent({
          company_id: companyId,
          worker_id: workerId,
          assignment_id: assignmentId,
          type: 'periodic_update',
          latitude: mostRecentLocation.coords.latitude,
          longitude: mostRecentLocation.coords.longitude,
          notes: 'Background heartbeat',
        });
        console.log('Successfully inserted periodic_update event.');
      }
    } catch (err) {
      console.error('Failed to insert location event from background task:', err);
    }
  }
});
