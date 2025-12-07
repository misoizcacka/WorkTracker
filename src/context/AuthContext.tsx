import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '../utils/supabase'; // Make sure this path is correct
import { Session, User } from '@supabase/supabase-js';

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
  refreshUser: () => Promise<void>;
}

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

  // Function to fetch and set company ID and details
  const fetchUserCompanyIdAndDetails = useCallback(async (loggedInUser: User | null) => {
    setIsCompanyIdLoading(true);
    setUserCompanyName(null);
    setUserCompanyCountry(null);
    setIsCompanyDetailsComplete(false);

    if (!loggedInUser) {
      setUserCompanyId(null);
      setIsCompanyIdLoading(false);
      return;
    }

    let currentCompanyId: string | null = null;

    if (loggedInUser.user_metadata?.company_id) {
      currentCompanyId = loggedInUser.user_metadata.company_id;
      setUserCompanyId(currentCompanyId);
    } else {
      // Fallback: fetch from employee table if not in user_metadata
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', loggedInUser.id)
        .maybeSingle();
      
      if (employeeData?.company_id) {
          currentCompanyId = employeeData.company_id;
          setUserCompanyId(currentCompanyId);
      } else if (employeeError) {
          console.error('Error fetching company_id from employee table in AuthContext:', employeeError);
      } else {
          setUserCompanyId(null);
      }
    }

    // Now fetch company details if companyId is found
    if (currentCompanyId) {
      const { data: companyDetails, error: companyDetailsError } = await supabase
        .from('companies')
        .select('name, country')
        .eq('id', currentCompanyId)
        .single();
      
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
      fetchUserCompanyIdAndDetails(initialSession?.user ?? null); // Fetch company ID and details for initial user
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
      fetchUserCompanyIdAndDetails(newSession?.user ?? null); // Fetch company ID and details for changed user state
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserCompanyIdAndDetails]); // Add fetchUserCompanyIdAndDetails to dependencies for useEffect

  const refreshUser = useCallback(async () => {
    // Explicitly refresh the session to get the latest data from the server
    const { data: { session: refreshedSession }, error: sessionError } = await supabase.auth.refreshSession();

    if (sessionError) {
      console.error("Error refreshing session:", sessionError.message);
      // Depending on the error, you might want to sign out the user or handle it differently
      return;
    }

    setSession(refreshedSession);
    setUser(refreshedSession?.user ?? null); // Use user from the refreshed session directly
    fetchUserCompanyIdAndDetails(refreshedSession?.user ?? null); // Refresh company ID and details after user refresh
  }, [fetchUserCompanyIdAndDetails]); // Add fetchUserCompanyIdAndDetails to dependencies for useCallback


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
      localStorage.removeItem('biometricUser');
    },
    session,
    user,
    isLoading, // Auth session loading
    userCompanyId,
    isCompanyIdLoading,
    userCompanyName,
    userCompanyCountry,
    isCompanyDetailsComplete,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  );
}
