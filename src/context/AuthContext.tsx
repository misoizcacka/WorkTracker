import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../utils/supabase'; // Make sure this path is correct
import { Session, User } from '@supabase/supabase-js';

// Define the shape of the context value
interface AuthContextType {
  signIn: (user: User) => void;
  signOut: () => void;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Start loading
    setIsLoading(true);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const refreshUser = async () => {
    // Explicitly refresh the session to get the latest data from the server
    const { data: { session: refreshedSession }, error: sessionError } = await supabase.auth.refreshSession();

    if (sessionError) {
      console.error("Error refreshing session:", sessionError.message);
      // Depending on the error, you might want to sign out the user or handle it differently
      return;
    }

        setSession(refreshedSession);
        setUser(refreshedSession?.user ?? null); // Use user from the refreshed session directly
      };

  const value: AuthContextType = {
    signIn: (user: User) => {
      // In this setup, signIn is handled by Supabase's auth UI or methods,
      // and the onAuthStateChange listener will update the state.
      // This function can be used for manual sign-in logic if needed.
      console.log("User signed in:", user);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      localStorage.removeItem('biometricUser'); // Explicitly clear biometricUser from localStorage
    },
    session,
    user,
    isLoading,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  );
}
