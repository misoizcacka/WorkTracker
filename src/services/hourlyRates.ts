import { supabase } from '~/utils/supabase';
import { HourlyRate } from '~/types';

/**
 * Fetches the full rate history for a worker, newest first.
 * Only callable by owners (enforced by RLS on the server).
 */
export async function fetchHourlyRateHistory(employeeId: string): Promise<HourlyRate[]> {
  const { data, error } = await supabase
    .from('employee_hourly_rates')
    .select('*')
    .eq('employee_id', employeeId)
    .order('effective_from', { ascending: false });

  if (error) {
    console.error('fetchHourlyRateHistory error:', error);
    throw error;
  }
  return (data ?? []) as HourlyRate[];
}

/**
 * Inserts a new rate entry. The rate is effective from the provided timestamp.
 * Append-only — existing entries are never modified.
 */
export async function insertHourlyRate(
  employeeId: string,
  companyId: string,
  hourlyRate: number,
  effectiveFrom: string // ISO timestamp
): Promise<HourlyRate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('employee_hourly_rates')
    .insert({
      employee_id: employeeId,
      company_id: companyId,
      hourly_rate: hourlyRate,
      effective_from: effectiveFrom,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('insertHourlyRate error:', error);
    throw error;
  }
  return data as HourlyRate;
}

/**
 * Returns the single rate that was effective at a given point in time.
 * Uses the most recent rate whose effective_from <= atTimestamp.
 * Returns null if no rate has been set yet.
 */
export function getRateAtTime(
  history: HourlyRate[],
  atTimestamp: string
): HourlyRate | null {
  // history is already sorted newest-first from fetchHourlyRateHistory
  const atMs = new Date(atTimestamp).getTime();
  return (
    history.find(r => new Date(r.effective_from).getTime() <= atMs) ?? null
  );
}

/**
 * Fetches the current effective rate for multiple employees in one call.
 * Returns a map of employee_id → hourly_rate (number) | null.
 *
 * Used by the payroll report to populate the rate column without N individual queries.
 */
export async function fetchCurrentRatesForEmployees(
  employeeIds: string[]
): Promise<Record<string, number | null>> {
  if (employeeIds.length === 0) return {};

  // Fetch all rates for these employees, ordered newest-first.
  // We'll pick the first (most recent effective_from <= now) per employee in JS.
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('employee_hourly_rates')
    .select('employee_id, hourly_rate, effective_from')
    .in('employee_id', employeeIds)
    .lte('effective_from', now)
    .order('effective_from', { ascending: false });

  if (error) {
    console.error('fetchCurrentRatesForEmployees error:', error);
    throw error;
  }

  const result: Record<string, number | null> = {};
  // Initialise all to null so missing workers are explicitly null, not undefined
  for (const id of employeeIds) result[id] = null;

  // First hit per employee_id is the most recent effective rate
  for (const row of data ?? []) {
    if (result[row.employee_id] === null) {
      result[row.employee_id] = row.hourly_rate;
    }
  }
  return result;
}
