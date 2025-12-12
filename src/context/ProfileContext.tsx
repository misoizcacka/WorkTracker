import React, { createContext, useContext } from 'react';
import { useEmployeeProfile, EmployeeProfile } from '~/hooks/useEmployeeProfile';

// Define the shape of the context value
interface ProfileContextType {
  profile: EmployeeProfile | null;
  isLoading: boolean;
  error: string | null;
  refetchProfile: () => Promise<void>;
}

// Create the context with a default undefined value
const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

/**
 * Provider component that wraps your app or a part of it to provide profile data.
 */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { profile, isLoading, error, refetch } = useEmployeeProfile();

  const value: ProfileContextType = {
    profile,
    isLoading,
    error,
    refetchProfile: refetch,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

/**
 * Custom hook to easily access the profile data from any component.
 * Throws an error if used outside of a ProfileProvider.
 */
export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
