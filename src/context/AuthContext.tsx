import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { setStorageItemAsync } from '../hooks/useStorageState';
import { supabase } from '../utils/supabase'; // Make sure this path is correct
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store'; // NEW: Import SecureStore
import 'react-native-get-random-values'; // NEW: Polyfill for UUID
import { v4 as uuidv4 } from 'uuid'; // NEW: Import UUID v4
import { Platform } from 'react-native';

// Define the shape of the context value
interface AuthContextType {
  signIn: (user: User) => void;
  signOut: () => void;
  session: Session | null;
  user: User | null;
  isLoading: boolean; // Is auth session loading
  userCompanyId: string | null; // NEW: The company ID for the logged-in user
  isCompanyIdLoading: boolean; // NEW: Is company ID being loaded
  userCompanyName: string | null; // NEW: Company name
  userCompanyCountry: string | null; // NEW: Company country
  isCompanyDetailsComplete: boolean; // NEW: Flag if company name is not placeholder
  userRole: string | null; // NEW: The role of the logged-in user
  refreshUser: () => Promise<void>;
  deviceToken: string | null; // NEW: Expose device token
  deviceSecret: string | null; // NEW: Expose device secret
} // NEW: Missing closing brace for AuthContextType

// Create the context with a default null value
const AuthContext = createContext<AuthContextType | null>(null);

// Create a custom hook for using the auth context
export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

// Create the SessionProvider component
export function SessionProvider(props: React.PropsWithChildren<{}>) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For auth session
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null); // NEW
  const [isCompanyIdLoading, setIsCompanyIdLoading] = useState(true); // NEW
  const [userCompanyName, setUserCompanyName] = useState<string | null>(null); // NEW
  const [userCompanyCountry, setUserCompanyCountry] = useState<string | null>(null); // NEW
  const [isCompanyDetailsComplete, setIsCompanyDetailsComplete] = useState(false); // NEW
  const [userRole, setUserRole] = useState<string | null>(null); // NEW
  const [deviceToken, setDeviceToken] = useState<string | null>(null); // NEW
  const [deviceSecret, setDeviceSecret] = useState<string | null>(null); // NEW

  // Function to fetch and set company ID and details
  const fetchUserDetailsAndCompany = useCallback(async (loggedInUser: User | null) => {
    setIsCompanyIdLoading(true);
    setUserCompanyName(null);
    setUserCompanyCountry(null);
    setIsCompanyDetailsComplete(false);
    setUserRole(null); // Clear user role when fetching new details

    if (!loggedInUser) {
      setUserCompanyId(null);
      setIsCompanyIdLoading(false);
      return;
    }

    let currentCompanyId: string | null = null;
    let currentRole: string | null = null;

    // Prioritize app_metadata then user_metadata for role. For company_id, user_metadata is fine.
    if (loggedInUser.app_metadata?.role) {
      currentRole = loggedInUser.app_metadata.role;
    } else if (loggedInUser.user_metadata?.role) {
      currentRole = loggedInUser.user_metadata.role;
    }

    if (loggedInUser.user_metadata?.company_id) {
      currentCompanyId = loggedInUser.user_metadata.company_id;
    }

    setUserCompanyId(currentCompanyId);
    setUserRole(currentRole); // Set the resolved user role

    // Now fetch company details if companyId is found
    if (currentCompanyId) {
      const { data: companyDetails, error: companyDetailsError } = await supabase
        .from('companies')
        .select('name, country')
        .eq('id', currentCompanyId)
        .maybeSingle();
      
      if (companyDetailsError) {
        console.error('Error fetching company details in AuthContext:', companyDetailsError);
      } else if (companyDetails) {
        setUserCompanyName(companyDetails.name);
        setUserCompanyCountry(companyDetails.country);
        // Check if company name is the placeholder name
        const isPlaceholderName = companyDetails.name?.startsWith('New Company - ');
        setIsCompanyDetailsComplete(!isPlaceholderName);
      }
    }

    setIsCompanyIdLoading(false);
  }, []); // Dependencies for useCallback. No external dependencies needed here.

  useEffect(() => {
    // Start loading auth session
    setIsLoading(true);

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoading(false);
      fetchUserDetailsAndCompany(initialSession?.user ?? null); // Fetch company ID and details for initial user
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
      fetchUserDetailsAndCompany(newSession?.user ?? null); // Fetch company ID and details for changed user state

      // NEW: Handle device token registration and storage
      if (newSession?.user) {
        (async () => {
          let storedDeviceToken: string | null = null;
          let storedDeviceSecret: string | null = null;

          if (Platform.OS === 'web') {
            storedDeviceToken = localStorage.getItem('device_token');
            storedDeviceSecret = localStorage.getItem('device_secret');
          } else {
            storedDeviceToken = await SecureStore.getItemAsync('device_token');
            storedDeviceSecret = await SecureStore.getItemAsync('device_secret');
          }

          if (storedDeviceToken && storedDeviceSecret) {
            setDeviceToken(storedDeviceToken);
            setDeviceSecret(storedDeviceSecret);
            console.log("AuthContext: Re-using stored device credentials - Token:", storedDeviceToken, "Secret:", storedDeviceSecret?.substring(0, 5) + "...");
          } else {
            const newDeviceToken = uuidv4();
            const newDeviceSecret = uuidv4();

            console.log("AuthContext: No stored device credentials found. Attempting to register new device - Generated Token:", newDeviceToken, "Secret:", newDeviceSecret.substring(0, 5) + "...");

            try {
              const { error: rpcError } = await supabase.rpc('register_device', {
                p_device_token: newDeviceToken,
                p_secret: newDeviceSecret,
              });

              if (rpcError) {
                console.error("AuthContext: Failed to register device with Supabase RPC:", rpcError.message);
                // Log the entire error object for more details
                console.error("AuthContext: Supabase RPC error details:", rpcError);
              } else {
                if (Platform.OS === 'web') {
                  localStorage.setItem('device_token', newDeviceToken);
                  localStorage.setItem('device_secret', newDeviceSecret);
                } else {
                  await SecureStore.setItemAsync('device_token', newDeviceToken);
                  await SecureStore.setItemAsync('device_secret', newDeviceSecret);
                }
                setDeviceToken(newDeviceToken);
                setDeviceSecret(newDeviceSecret);
                console.log("AuthContext: Successfully registered and stored new device credentials - Token:", newDeviceToken, "Secret:", newDeviceSecret.substring(0, 5) + "...");
              }
            } catch (e) {
              console.error("AuthContext: Error during device registration RPC call:", e);
            }
          }
        })();
      } else {
        // User logged out, clear device credentials
        setDeviceToken(null);
        setDeviceSecret(null);
        if (Platform.OS === 'web') {
          localStorage.removeItem('device_token');
          localStorage.removeItem('device_secret');
        } else {
          SecureStore.deleteItemAsync('device_token');
          SecureStore.deleteItemAsync('device_secret');
        }
        console.log("AuthContext: User logged out, cleared device credentials.");
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserDetailsAndCompany]); // Add fetchUserDetailsAndCompany to dependencies for useEffect

  const refreshUser = useCallback(async () => {
    // Explicitly refresh the session to get the latest data from the server
    const { data: { session: refreshedSession }, error: sessionError } = await supabase.auth.refreshSession();

    if (sessionError) {
      console.error("Error refreshing session:", sessionError.message);
      return;
    }

    // After refreshing the token, explicitly get the session and user again to ensure latest metadata
    const { data: { session: latestSession }, error: latestSessionError } = await supabase.auth.getSession();
    const { data: { user: latestUser }, error: latestUserError } = await supabase.auth.getUser();

    if (latestSessionError || latestUserError) {
        console.error("Error fetching latest session/user after refresh:", latestSessionError?.message || latestUserError?.message);
        return;
    }

    setSession(latestSession);
    setUser(latestUser); // Use the latest fetched user object
    fetchUserDetailsAndCompany(latestUser); // Refresh company ID and details after user refresh
  }, [fetchUserDetailsAndCompany]); // Add fetchUserDetailsAndCompany to dependencies for useCallback


  const value: AuthContextType = {
    signIn: (user: User) => {
      console.log("User signed in:", user);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserCompanyId(null); // Clear company ID on sign out
      setIsCompanyIdLoading(false); // Reset loading state
      setUserCompanyName(null);
      setUserCompanyCountry(null);
      setIsCompanyDetailsComplete(false);
      setUserRole(null); // NEW: Clear user role
      await setStorageItemAsync('biometricUser', null); // NEW LINE
    },
    session,
    user,
    isLoading, // Auth session loading
    userCompanyId,
    isCompanyIdLoading,
    userCompanyName,
    userCompanyCountry,
    isCompanyDetailsComplete,
    userRole, // NEW
    refreshUser,
    deviceToken, // NEW
    deviceSecret, // NEW
  };

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  );
}
