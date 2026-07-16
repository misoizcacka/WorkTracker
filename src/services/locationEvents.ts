import { supabase } from '../utils/supabase';

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
  full_name: string;
}

export async function fetchLocationEventsForWorkerInRange(
  workerId: string,
  startIso: string,
  endIso: string
): Promise<LocationEventRecord[]> {
  const { data, error } = await supabase
    .from('location_events')
    .select('*')
    .eq('worker_id', workerId)
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching location events in range:', error);
    throw error;
  }

  return (data ?? []) as LocationEventRecord[];
}

export async function upsertLocationEvents(events: LocationEventRecord[]): Promise<LocationEventRecord[]> {
  if (events.length === 0) return [];

  // Direct table inserts/upserts are blocked by RLS (REVOKE INSERT FROM authenticated).
  // Must call the SECURITY DEFINER RPC instead.
  const { error } = await supabase.rpc('insert_location_events_from_app', {
    p_events: events.map(e => ({
      id: e.id,
      created_at: e.created_at,
      company_id: e.company_id,
      worker_id: e.worker_id,
      assignment_id: e.assignment_id,
      type: e.type,
      latitude: e.latitude,
      longitude: e.longitude,
      notes: e.notes ?? null,
    })),
  });

  if (error) {
    console.error('Error upserting location events:', error);
    throw error;
  }

  return events;
}

/**
 * Inserts a new location event record into Supabase.
 * Routes through upsertLocationEvents which uses the SECURITY DEFINER RPC
 * (direct table inserts are blocked by RLS).
 */
export async function insertLocationEvent(event: Omit<LocationEventRecord, 'id' | 'created_at'>): Promise<LocationEventRecord> {
  const { v4: uuidv4 } = await import('uuid');
  const full: LocationEventRecord = {
    ...event,
    id: uuidv4(),
    created_at: new Date().toISOString(),
  };
  await upsertLocationEvents([full]);
  return full;
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
