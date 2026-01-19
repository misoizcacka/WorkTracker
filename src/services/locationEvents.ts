import { supabase } from '../utils/supabase';
import { WorkSession } from '../types'; // Assuming WorkSession type is needed for context

export interface LocationEventRecord {
  id: string; // Supabase UUID
  created_at: string;
  company_id: string;
  worker_id: string;
  assignment_id: string;
  type: string; // 'enter_geofence' or 'exit_geofence'
  latitude: number;
  longitude: number;
  notes?: string;
}

export interface LatestLocation {
  worker_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

/**
 * Inserts a new location event record into Supabase.
 */
export async function insertLocationEvent(event: Omit<LocationEventRecord, 'id' | 'created_at'>): Promise<LocationEventRecord> {
  const { data, error } = await supabase
    .from('location_events')
    .insert(event)
    .select()
    .single();

  if (error) {
    console.error('Error inserting location event:', error);
    throw error;
  }

  return data as LocationEventRecord;
}

/**
 * Fetches the most recent location for a given list of worker IDs.
 * @param workerIds An array of worker UUIDs.
 * @returns A promise that resolves to an array of LatestLocation objects.
 */
export async function fetchLatestLocationForWorkers(workerIds: string[]): Promise<LatestLocation[]> {
  if (workerIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_latest_worker_locations', {
    worker_ids: workerIds,
  });

  if (error) {
    console.error('Error fetching latest worker locations:', error);
    throw error;
  }

  return data as LatestLocation[];
}
