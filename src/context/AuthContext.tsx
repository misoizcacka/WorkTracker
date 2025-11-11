import React from 'react';
import { useStorageState } from '../hooks/useStorageState';

const AuthContext = React.createContext<{ signIn: (user: any) => void; signOut: () => void; session?: string | null; isLoading: boolean, user: any } | null>(null);

// This hook can be used to access the user info.
export function useSession() {
  const value = React.useContext(AuthContext);
  if (process.env.NODE_ENV !== 'production') {
    if (!value) {
      throw new Error('useSession must be wrapped in a <SessionProvider />');
    }
  }

  return value;
}

export function SessionProvider(props: React.PropsWithChildren) {
  const [[isLoading, session], setSession] = useStorageState('session');

  return (
    <AuthContext.Provider
      value={{
        signIn: (user) => {
          // Perform sign-in logic here
          setSession(JSON.stringify(user));
        },
        signOut: () => {
          setSession(null);
        },
        user: session ? JSON.parse(session) : null,
        session,
        isLoading,
      }}>
      {props.children}
    </AuthContext.Provider>
  );
}
