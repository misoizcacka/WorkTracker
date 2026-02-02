import { useState, useEffect, useCallback } from 'react';
import { supabase } from '~/utils/supabase';
import { useSession } from '~/context/AuthContext';
import { getAvatarPublicUrl } from '~/services/profile';

// Define the shape of an employee profile
export interface EmployeeProfile {
  id: string;
  company_id: string;
  full_name: string;
  phone: string | null;
  role: 'owner' | 'manager' | 'worker';
  avatar_url: string | null; // The raw path from storage
  public_avatar_url: string | null; // The full public URL for rendering
}

/**
 * A hook to fetch and manage the logged-in user's employee profile.
 * It fetches the profile from the 'employees' table based on the auth user's ID.
 *
 * @returns An object containing the profile data, loading state, error state, and a refetch function.
 */
export function useEmployeeProfile() {
  const { user, isLoading: isSessionLoading } = useSession();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Changed from single() to maybeSingle()

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        const publicUrl = getAvatarPublicUrl(data.avatar_url);
        setProfile({
            ...data,
            public_avatar_url: publicUrl
        });
      } else {
        // Handle case where no data is returned (e.g., due to RLS or record not found)
        setProfile(null);
        setError('Employee profile not found or accessible.');
      }
    } catch (err: any) {
      console.error('Error fetching employee profile:', err.message);
      setError('Could not fetch your profile. Please try again.');
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    // Fetch profile only when the auth session is loaded and we have a user
    if (!isSessionLoading && user) {
      fetchProfile();
    } else if (!isSessionLoading && !user) {
        // If session is loaded and there's no user, stop loading.
        setIsLoading(false);
    }
  }, [user, isSessionLoading, fetchProfile]);

  return { 
    profile, 
    isLoading: isLoading || isSessionLoading, 
    error, 
    refetch: fetchProfile 
  };
}
