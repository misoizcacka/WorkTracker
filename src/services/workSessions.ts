import { supabase } from '../utils/supabase';
import { WorkSession } from '../types';

/**
 * Fetches the currently active work session for a given worker.
 * An active session is one that has a `start_time` but no `end_time`.
 * @param workerId The ID of the worker.
 * @returns The active WorkSession or null if none is found.
 */
export async function fetchActiveWorkSession(workerId: string): Promise<WorkSession | null> {
  const { data, error } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('worker_id', workerId)
    .is('end_time', null)
    .maybeSingle(); // Use maybeSingle to gracefully handle 0 rows

  if (error) {
    console.error('Error fetching active work session:', error);
    throw error;
  }

  return data;
}

/**
 * Starts a new work session.
 * @param workerId The ID of the worker.
 * @param assignmentId The ID of the assignment this session is for.
 * @param companyId The ID of the company.
 * @returns The newly created WorkSession.
 */
export async function insertWorkSession(workerId: string, assignmentId: string, companyId: string): Promise<WorkSession> {
  const { data, error } = await supabase
    .from('work_sessions')
    .insert({
      worker_id: workerId,
      assignment_id: assignmentId,
      company_id: companyId,
      start_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting work session:', error);
    throw error;
  }

  return data as WorkSession;
}

/**
 * Ends an existing work session.
 * @param sessionId The ID of the session to end.
 * @returns The updated WorkSession.
 */
export async function endWorkSession(sessionId: string): Promise<WorkSession> {
  const now = new Date();
  
  // No need to fetch start_time or calculate duration here, as it's now a frontend calculation.
  const { data, error } = await supabase
    .from('work_sessions')
    .update({
      end_time: now.toISOString(),
      // duration_seconds is no longer stored in DB, so removed from update payload
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating work session:', error);
    throw error;
  }

  return data as WorkSession;
}

/**
 * Updates the assignment ID of an existing active work session.
 * Used for automatic project transitions without ending the work session.
 * @param sessionId The ID of the active session to update.
 * @param newAssignmentId The ID of the new assignment to associate with the session.
 * @returns The updated WorkSession.
 */
export async function updateWorkSessionAssignment(
  sessionId: string,
  newAssignmentId: string
): Promise<WorkSession> {
  const { data, error } = await supabase
    .from('work_sessions')
    .update({ assignment_id: newAssignmentId })
    .eq('id', sessionId)
    .is('end_time', null) // Ensure only active sessions are updated
    .select()
    .single();

  if (error) {
    console.error('Error updating work session assignment:', error);
    throw error;
  }
  if (!data) {
    throw new Error('Active work session not found for update.');
  }

  return data as WorkSession;
}

/**
 * Fetches all work sessions for a given worker on a specific date.
 * @param workerId The ID of the worker.
 * @param date The date to fetch sessions for (e.g., '2025-12-26').
 * @returns An array of WorkSession objects.
 */
export async function fetchWorkSessionsByDate(workerId: string, date: string): Promise<WorkSession[]> {
  const { data, error } = await supabase
    .from('work_sessions')
    .select('*, worker_assignments!inner(sort_key)')
    .eq('worker_id', workerId)
    .gte('start_time', `${date}T00:00:00.000Z`)
    .lte('start_time', `${date}T23:59:59.999Z`)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching work sessions by date:', error);
    throw error;
  }

  return data as WorkSession[];
}

/**
 * Updates an existing work session record in Supabase.
 * @param sessionId The ID of the session to update.
 * @param updates A partial WorkSession object with fields to update.
 * @returns The updated WorkSession.
 */
export async function updateWorkSession(
  sessionId: string,
  updates: Partial<WorkSession>
): Promise<WorkSession> {
  const { data, error } = await supabase
    .from('work_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating work session:', error);
    throw error;
  }
  if (!data) {
    throw new Error('Work session not found for update.');
  }

  return data as WorkSession;
}
