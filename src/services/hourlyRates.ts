import { supabase } from '../utils/supabase';
import { HourlyRate } from '../types';

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
 * Upserts a rate entry. If a rate exists for the same employee + effective_from,
 * it will be updated. Otherwise a new rate is inserted.
 * This allows updating the current month's rate while keeping past rates immutable.
 */
export async function upsertHourlyRate(
  employeeId: string,
  companyId: string,
  hourlyRate: number,
  effectiveFrom: string // ISO timestamp
): Promise<HourlyRate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('employee_hourly_rates')
    .upsert({
      employee_id: employeeId,
      company_id: companyId,
      hourly_rate: hourlyRate,
      effective_from: effectiveFrom,
      created_by: user.id,
    }, {
      onConflict: 'employee_id,effective_from', // Unique constraint columns
      ignoreDuplicates: false, // Update on conflict
    })
    .select()
    .single();

  if (error) {
    console.error('upsertHourlyRate error:', error);
    throw error;
  }

  return data as HourlyRate;
}

/**
 * @deprecated Use upsertHourlyRate instead
 * Inserts a new rate entry. The rate is effective from the provided timestamp.
 * Append-only — existing entries are never modified.
 */
export async function insertHourlyRate(
  employeeId: string,
  companyId: string,
  hourlyRate: number,
  effectiveFrom: string // ISO timestamp
): Promise<HourlyRate> {
  return upsertHourlyRate(employeeId, companyId, hourlyRate, effectiveFrom);
}

/**
 * Check if a worker has any hourly rate set
 */
export async function hasHourlyRate(employeeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('employee_hourly_rates')
    .select('id')
    .eq('employee_id', employeeId)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (expected when no rate exists)
    console.error('Error checking hourly rate:', error);
    return false;
  }

  return !!data;
}

/**
 * Get current hourly rate for a worker (most recent effective rate)
 */
export async function getCurrentHourlyRate(employeeId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('employee_hourly_rates')
    .select('hourly_rate')
    .eq('employee_id', employeeId)
    .lte('effective_from', new Date().toISOString())
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rate found
      return null;
    }
    console.error('Error fetching hourly rate:', error);
    return null;
  }

  return data?.hourly_rate ?? null;
}

/**
 * Batch check multiple workers for CURRENT hourly rates (effective as of today)
 * Returns Map of employeeId -> hasCurrentRate
 */
export async function batchCheckHourlyRates(employeeIds: string[]): Promise<Map<string, boolean>> {
  if (employeeIds.length === 0) {
    return new Map();
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('employee_hourly_rates')
    .select('employee_id')
    .in('employee_id', employeeIds)
    .lte('effective_from', now); // Only rates that are already effective

  if (error) {
    console.error('Error batch checking hourly rates:', error);
    return new Map();
  }

  // Get unique employee IDs who have at least one rate effective today
  const employeesWithCurrentRates = new Set(data.map(row => row.employee_id));
  const resultMap = new Map<string, boolean>();
  
  employeeIds.forEach(id => {
    resultMap.set(id, employeesWithCurrentRates.has(id));
  });

  return resultMap;
}
