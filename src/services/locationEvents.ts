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