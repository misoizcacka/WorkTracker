import { supabase } from '../utils/supabase';
import { AssignmentRecord } from '../types';

/**
 * Fetches worker day assignments for a specific worker and date.
 * @param workerId The UUID of the worker.
 * @param assignedDate The date for which to fetch assignments (YYYY-MM-DD).
 * @returns A promise that resolves to a single WorkerDayAssignments object or null.
 */
export async function fetchAssignmentsForWorker(
  workerId: string,
  assignedDate: string
): Promise<AssignmentRecord | null> {
  const { data, error } = await supabase
    .from('worker_assignments')
    .select('*')
    .eq('worker_id', workerId)
    .eq('assigned_date', assignedDate)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // PostgREST error for "single() row not found"
      return null;
    }
    console.error('Error fetching assignments for worker:', error);
    throw error;
  }
  return data as AssignmentRecord;
}

/**
 * Fetches worker day assignments for a specific set of workers and a date.
 * @param companyId The ID of the company.
 * @param assignedDate The date for which to fetch assignments (YYYY-MM-DD).
 * @param workerIds An array of worker UUIDs.
 * @returns A promise that resolves to an array of WorkerDayAssignments objects.
 */
export async function fetchAssignmentsForWorkers(
  companyId: string,
  assignedDate: string,
  workerIds: string[]
): Promise<AssignmentRecord[]> {
  if (workerIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('worker_assignments')
    .select('*')
    .eq('company_id', companyId)
    .eq('assigned_date', assignedDate)
    .in('worker_id', workerIds)
    .order('sort_key', { ascending: true }); // Order by sort_key for correct sequence

  if (error) {
    console.error('Error fetching assignments for workers:', error);
    throw error;
  }
  return data as AssignmentRecord[];
}

/**
 * Inserts a new assignment record.
 * @param assignment The assignment data to insert.
 * @returns A promise that resolves to the newly created AssignmentRecord object or null.
 */
export async function insertAssignment(
  assignment: Omit<AssignmentRecord, 'id' | 'created_at'> & {id: string, created_by: string, company_id: string, synced?: boolean}
): Promise<AssignmentRecord | null> {
  // The 'synced' and temporary local 'id' properties are for the client only.
  // We must remove them before sending the data to Supabase, so the DB can generate a real uuid.
  const { synced, id, ...dbAssignment } = assignment;

  const { data, error } = await supabase
    .from('worker_assignments')
    .insert(dbAssignment)
    .select()
    .single();

  if (error) {
    console.error('Error inserting assignment:', error);
    throw error;
  }
  return data as AssignmentRecord;
}

/**
 * Updates an existing assignment record.
 * @param id The ID of the assignment to update.
 * @param updates The partial AssignmentRecord object with fields to update.
 * @returns A promise that resolves to the updated AssignmentRecord object or null.
 */
export async function updateAssignment(
  id: string,
  updates: Partial<Omit<AssignmentRecord, 'id' | 'created_at' | 'created_by'>>
): Promise<AssignmentRecord | null> {
  const { data, error } = await supabase
    .from('worker_assignments')
    .update(updates)
    .eq('id', id)
    .select(); // Removed .single()

  if (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
  // Expecting a single record, so return the first one if data is not empty
  return (data && data.length > 0) ? data[0] as AssignmentRecord : null;
}

/**
 * Deletes an assignment record.
 * @param id The ID of the assignment to delete.
 * @returns A promise that resolves to void on successful deletion.
 */
export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase
    .from('worker_assignments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
}