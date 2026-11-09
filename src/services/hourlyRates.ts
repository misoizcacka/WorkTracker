import { supabase } from '../utils/supabase';

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
 * Batch check multiple workers for hourly rates
 * Returns Map of employeeId -> hasRate
 */
export async function batchCheckHourlyRates(employeeIds: string[]): Promise<Map<string, boolean>> {
  if (employeeIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('employee_hourly_rates')
    .select('employee_id')
    .in('employee_id', employeeIds);

  if (error) {
    console.error('Error batch checking hourly rates:', error);
    return new Map();
  }

  const employeesWithRates = new Set(data.map(row => row.employee_id));
  const resultMap = new Map<string, boolean>();
  
  employeeIds.forEach(id => {
    resultMap.set(id, employeesWithRates.has(id));
  });

  return resultMap;
}
