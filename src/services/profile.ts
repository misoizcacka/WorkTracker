import { supabase } from '~/utils/supabase';
import * as ImagePicker from 'expo-image-picker';

/**
 * Uploads an avatar image to Supabase Storage.
 * The file is stored under a path scoped to the user's ID to ensure security.
 *
 * @param userId The ID of the user uploading the avatar.
 * @param uri The local URI of the image file.
 * @returns The server-side path of the uploaded file.
 * @throws An error if the upload fails.
 */
export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const fileExtension = uri.split('.').pop();
  const fileName = `${Date.now()}.${fileExtension}`;
  const filePath = `${userId}/${fileName}`;

  // Expo's ImagePicker gives a local URI, we need to fetch it as a blob
  const response = await fetch(uri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, blob, {
      cacheControl: '3600', // Cache for 1 hour
    });

  if (error) {
    throw new Error(`Avatar upload failed: ${error.message}`);
  }

  return data.path;
}

/**
 * Updates the user's profile data in the 'employees' table.
 *
 * @param userId The ID of the user whose profile is being updated.
 * @param updates An object containing the fields to update (e.g., { avatar_url, full_name }).
 * @returns The updated employee data.
 * @throws An error if the update fails.
 */
export async function updateEmployeeProfile(userId: string, updates: { [key: string]: any }) {
    const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
    }

    return data;
}

/**
 * Retrieves the public URL for a given file path from Supabase Storage.
 *
 * @param path The file path in the storage bucket.
 * @returns The public URL of the file.
 */
export function getAvatarPublicUrl(path: string): string | null {
    if (!path) return null;
    
    const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

    return data?.publicUrl || null;
}
