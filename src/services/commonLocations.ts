import { supabase } from '../utils/supabase';

interface CommonLocation {
  id: string;
  name: string;
  company_id: string; // This will likely be handled by RLS/database functions
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface NewCommonLocation {
  name: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface UpdateCommonLocation {
  name?: string;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Fetches all common locations for the current user's company.
 * RLS will ensure only relevant locations are returned.
 * @returns A promise that resolves to an array of common location objects, or throws an error.
 */
export async function fetchCommonLocations(): Promise<CommonLocation[] | null> {
  const { data, error } = await supabase
    .from('common_locations')
    .select('*')
    .order('name', { ascending: true }); // Order for consistent display

  if (error) {
    console.error('Error fetching common locations:', error);
    throw error;
  }
  return data as CommonLocation[];
}

/**
 * Adds a new common location.
 * The company_id is implicitly handled by RLS/database policies based on the authenticated user.
 * @param locationData An object containing the name, latitude, and longitude of the new location.
 * @returns A promise that resolves to the newly created common location object, or throws an error.
 */
export async function addCommonLocation(
  locationData: NewCommonLocation
): Promise<CommonLocation | null> {
  const { data, error } = await supabase
    .from('common_locations')
    .insert(locationData)
    .select()
    .single();

  if (error) {
    console.error('Error adding common location:', error);
    throw error;
  }
  return data as CommonLocation;
}

/**
 * Updates an existing common location.
 * @param id The UUID of the common location to update.
 * @param updates An object containing the fields to update (name, latitude, longitude).
 * @returns A promise that resolves to the updated common location object, or throws an error.
 */
export async function updateCommonLocation(
  id: string,
  updates: UpdateCommonLocation
): Promise<CommonLocation | null> {
  const { data, error } = await supabase
    .from('common_locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating common location:', error);
    throw error;
  }
  return data as CommonLocation;
}

/**
 * Deletes a common location.
 * @param id The UUID of the common location to delete.
 * @returns A promise that resolves to null on successful deletion, or throws an error.
 */
export async function deleteCommonLocation(id: string): Promise<null> {
  const { error } = await supabase
    .from('common_locations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting common location:', error);
    throw error;
  }
  return null;
}