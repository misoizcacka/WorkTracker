import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { setStorageItemAsync } from '../hooks/useStorageState';
import { supabase } from '../utils/supabase'; 
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store'; 
import 'react-native-get-random-values'; 
import { v4 as uuidv4 } from 'uuid'; 
import { Platform } from 'react-native';

// Define the shape of the context value
interface AuthContextType {
  signIn: (user: User) => void;
  signOut: () => void;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  userCompanyId: string | null;
  isCompanyIdLoading: boolean;
  userCompanyName: string | null;
  userCompanyCountry: string | null;
  userSubscriptionPeriodEnd: string | null;
  isSubscriptionExpired: boolean; // NEW
  isCompanyDetailsComplete: boolean;
  userRole: string | null;
  refreshUser: () => Promise<void>;
  deviceToken: string | null;
  deviceSecret: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export function SessionProvider(props: React.PropsWithChildren<{}>) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [isCompanyIdLoading, setIsCompanyIdLoading] = useState(true);
  const [userCompanyName, setUserCompanyName] = useState<string | null>(null);
  const [userCompanyCountry, setUserCompanyCountry] = useState<string | null>(null);
  const [userSubscriptionPeriodEnd, setUserSubscriptionPeriodEnd] = useState<string | null>(null);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false); // NEW
  const [isCompanyDetailsComplete, setIsCompanyDetailsComplete] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [deviceSecret, setDeviceSecret] = useState<string | null>(null);

  const fetchUserDetailsAndCompany = useCallback(async (loggedInUser: User | null) => {
    setIsCompanyIdLoading(true);
    setUserCompanyName(null);
    setUserCompanyCountry(null);
    setUserSubscriptionPeriodEnd(null);
    setIsSubscriptionExpired(false);
    setIsCompanyDetailsComplete(false);
    setUserRole(null);

    if (!loggedInUser) {
      setUserCompanyId(null);
      setIsCompanyIdLoading(false);
      return;
    }

    let currentCompanyId: string | null = null;
    let currentRole: string | null = null;

    if (loggedInUser.app_metadata?.role) {
      currentRole = loggedInUser.app_metadata.role;
    } else if (loggedInUser.user_metadata?.role) {
      currentRole = loggedInUser.user_metadata.role;
    }

    if (loggedInUser.user_metadata?.company_id) {
      currentCompanyId = loggedInUser.user_metadata.company_id;
    }

    setUserCompanyId(currentCompanyId);
    setUserRole(currentRole);

    if (currentCompanyId) {
      const { data: companyDetails, error: companyDetailsError } = await supabase
        .from('companies')
        .select('name, country, subscription_period_end')
        .eq('id', currentCompanyId)
        .maybeSingle();
      
      if (companyDetailsError) {
        console.error('Error fetching company details in AuthContext:', companyDetailsError);
      } else if (companyDetails) {
        setUserCompanyName(companyDetails.name);
        setUserCompanyCountry(companyDetails.country);
        
        let finalPeriodEnd = companyDetails.subscription_period_end;

        // Sync if expired
        if (finalPeriodEnd && new Date(finalPeriodEnd) < new Date()) {
          console.log('Subscription period ended, syncing with Stripe...');
          try {
            const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-subscription-status', {
              body: { companyId: currentCompanyId }
            });
            if (!syncError && syncData) {
              finalPeriodEnd = syncData.periodEnd;
            }
          } catch (err) {
            console.error('Error syncing subscription:', err);
          }
        }

        setUserSubscriptionPeriodEnd(finalPeriodEnd);
        
        // Block if date is in the past
        const isExpired = finalPeriodEnd && new Date(finalPeriodEnd) < new Date();
        setIsSubscriptionExpired(!!isExpired);

        const isPlaceholderName = companyDetails.name?.startsWith('New Company - ');
        setIsCompanyDetailsComplete(!isPlaceholderName);
      }
    }

    setIsCompanyIdLoading(false);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoading(false);
      fetchUserDetailsAndCompany(initialSession?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
      fetchUserDetailsAndCompany(newSession?.user ?? null);

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
          } else {
            const newDeviceToken = uuidv4();
            const newDeviceSecret = uuidv4();
            try {
              const { error: rpcError } = await supabase.rpc('register_device', {
                p_device_token: newDeviceToken,
                p_secret: newDeviceSecret,
              });

              if (!rpcError) {
                if (Platform.OS === 'web') {
                  localStorage.setItem('device_token', newDeviceToken);
                  localStorage.setItem('device_secret', newDeviceSecret);
                } else {
                  await SecureStore.setItemAsync('device_token', newDeviceToken);
                  await SecureStore.setItemAsync('device_secret', newDeviceSecret);
                }
                setDeviceToken(newDeviceToken);
                setDeviceSecret(newDeviceSecret);
              }
            } catch (e) {
              console.error("AuthContext: Error during device registration:", e);
            }
          }
        })();
      } else {
        setDeviceToken(null);
        setDeviceSecret(null);
        if (Platform.OS === 'web') {
          localStorage.removeItem('device_token');
          localStorage.removeItem('device_secret');
        } else {
          SecureStore.deleteItemAsync('device_token');
          SecureStore.deleteItemAsync('device_secret');
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserDetailsAndCompany]);

  const refreshUser = useCallback(async () => {
    const { data: { session: refreshedSession }, error: sessionError } = await supabase.auth.refreshSession();
    if (sessionError) return;
    const { data: { user: latestUser } } = await supabase.auth.getUser();
    if (latestUser) {
      setUser(latestUser);
      fetchUserDetailsAndCompany(latestUser);
    }
  }, [fetchUserDetailsAndCompany]);

  const value: AuthContextType = {
    signIn: (user: User) => { console.log("User signed in:", user); },
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserCompanyId(null);
      setIsCompanyIdLoading(false);
      setUserCompanyName(null);
      setUserCompanyCountry(null);
      setUserSubscriptionPeriodEnd(null);
      setIsSubscriptionExpired(false);
      setIsCompanyDetailsComplete(false);
      setUserRole(null);
      await setStorageItemAsync('biometricUser', null);
    },
    session,
    user,
    isLoading,
    userCompanyId,
    isCompanyIdLoading,
    userCompanyName,
    userCompanyCountry,
    userSubscriptionPeriodEnd,
    isSubscriptionExpired,
    isCompanyDetailsComplete,
    userRole,
    refreshUser,
    deviceToken,
    deviceSecret,
  };

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  );
}
