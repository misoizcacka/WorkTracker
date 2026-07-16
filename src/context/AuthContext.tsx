import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { setStorageItemAsync } from '../hooks/useStorageState';
import { supabase } from '../utils/supabase'; 
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store'; 
import 'react-native-get-random-values'; 
import { v4 as uuidv4 } from 'uuid'; 
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const COMPANY_DETAILS_CACHE_KEY = 'cached_company_details';

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
  userScheduledWorkerSeats: number | null;
  userScheduledChangeEffectiveAt: string | null;
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
  const [userScheduledWorkerSeats, setUserScheduledWorkerSeats] = useState<number | null>(null);
  const [userScheduledChangeEffectiveAt, setUserScheduledChangeEffectiveAt] = useState<string | null>(null);
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
    setUserScheduledWorkerSeats(null);
    setUserScheduledChangeEffectiveAt(null);
    setIsSubscriptionExpired(false);
    // NOTE: intentionally NOT resetting isCompanyDetailsComplete or userRole here
    // to avoid redirect flashes in _layout while async fetch is in progress

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

    if (!currentCompanyId) {
      setIsCompanyIdLoading(false);
      return;
    }

    // Check network before hitting Supabase — if offline load from cache immediately
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable !== false;

    if (!isOnline) {
      // Try to load previously cached company details from SecureStore
      try {
        const cached = await SecureStore.getItemAsync(COMPANY_DETAILS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.company_id === currentCompanyId) {
            setUserCompanyName(parsed.name ?? null);
            setUserCompanyCountry(parsed.country ?? null);
            setUserSubscriptionPeriodEnd(parsed.subscription_period_end ?? null);
            setUserScheduledWorkerSeats(parsed.scheduled_worker_seats ?? null);
            setUserScheduledChangeEffectiveAt(parsed.scheduled_change_effective_at ?? null);
            const isExpired = parsed.subscription_period_end && new Date(parsed.subscription_period_end) < new Date();
            setIsSubscriptionExpired(!!isExpired);
            const isPlaceholderName = !parsed.name || parsed.name === 'New Company' || parsed.name?.startsWith('New Company - ');
            setIsCompanyDetailsComplete(!isPlaceholderName && !!parsed.country);
          }
        }
      } catch (cacheErr) {
        console.warn('AuthContext: failed to read cached company details:', cacheErr);
      }
      setIsCompanyIdLoading(false);
      return;
    }

    type CompanyDetails = {
      id?: string;
      name: string | null;
      country: string | null;
      subscription_period_end: string | null;
      scheduled_worker_seats: number | null;
      scheduled_change_effective_at: string | null;
    };

    let companyDetails: CompanyDetails | null = null;

    try {
      const { data: directCompanyDetails, error: companyDetailsError } = await supabase
          .from('companies')
          .select('name, country, subscription_period_end, scheduled_worker_seats, scheduled_change_effective_at')
          .eq('id', currentCompanyId)
          .maybeSingle();

      if (companyDetailsError) {
        console.error('Error fetching company details in AuthContext:', companyDetailsError);
      } else {
        companyDetails = directCompanyDetails;
      }
    } catch (networkErr) {
      console.warn('AuthContext: network error fetching company details, falling back to cache:', networkErr);
    }

    if (!companyDetails) {
      try {
        const { data: rpcCompanyDetails, error: rpcCompanyDetailsError } = await supabase
          .rpc('get_my_company_details')
          .maybeSingle();

        if (rpcCompanyDetailsError) {
          console.error('Error fetching company details fallback in AuthContext:', rpcCompanyDetailsError);
        } else {
          const fallbackCompanyDetails = rpcCompanyDetails as CompanyDetails | null;
          if (fallbackCompanyDetails?.id === currentCompanyId) {
            companyDetails = fallbackCompanyDetails;
          }
        }
      } catch (networkErr) {
        console.warn('AuthContext: network error on RPC fallback:', networkErr);
      }
    }

    // If both network fetches failed, try cache as last resort
    if (!companyDetails) {
      try {
        const cached = await SecureStore.getItemAsync(COMPANY_DETAILS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.company_id === currentCompanyId) {
            companyDetails = parsed;
          }
        }
      } catch (cacheErr) {
        console.warn('AuthContext: failed to read cached company details on fallback:', cacheErr);
      }
    }

    if (companyDetails) {
      setUserCompanyName(companyDetails.name);
      setUserCompanyCountry(companyDetails.country);
      setUserScheduledWorkerSeats(companyDetails.scheduled_worker_seats ?? null);
      setUserScheduledChangeEffectiveAt(companyDetails.scheduled_change_effective_at ?? null);
      
      let finalPeriodEnd = companyDetails.subscription_period_end;

      // Sync if expired (only when online)
      if (isOnline && finalPeriodEnd && new Date(finalPeriodEnd) < new Date()) {
        console.log('Subscription period ended, syncing with Stripe...');
        try {
          const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-subscription-status', {
            body: { companyId: currentCompanyId }
          });
          if (!syncError && syncData) {
            finalPeriodEnd = syncData.periodEnd;
            if (syncData.clearedScheduledDowngrade) {
              setUserScheduledWorkerSeats(null);
              setUserScheduledChangeEffectiveAt(null);
            }
          }
        } catch (err) {
          console.error('Error syncing subscription:', err);
        }
      }

      setUserSubscriptionPeriodEnd(finalPeriodEnd);
      
      // Block if date is in the past
      const isExpired = finalPeriodEnd && new Date(finalPeriodEnd) < new Date();
      setIsSubscriptionExpired(!!isExpired);

      const isPlaceholderName = !companyDetails.name || companyDetails.name === 'New Company' || companyDetails.name?.startsWith('New Company - ');
      setIsCompanyDetailsComplete(!isPlaceholderName && !!companyDetails.country);

      // Cache successful fetch to SecureStore for offline use
      try {
        await SecureStore.setItemAsync(COMPANY_DETAILS_CACHE_KEY, JSON.stringify({
          company_id: currentCompanyId,
          name: companyDetails.name,
          country: companyDetails.country,
          subscription_period_end: finalPeriodEnd,
          scheduled_worker_seats: companyDetails.scheduled_worker_seats ?? null,
          scheduled_change_effective_at: companyDetails.scheduled_change_effective_at ?? null,
        }));
      } catch (cacheErr) {
        console.warn('AuthContext: failed to cache company details:', cacheErr);
      }
    }

    setIsCompanyIdLoading(false);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        setIsLoading(false);
        fetchUserDetailsAndCompany(initialSession.user);
        return;
      }

      // No active session — try silent re-auth from stored worker credentials
      // before giving up and showing the login screen.
      if (Platform.OS !== 'web') {
        try {
          const stored = await SecureStore.getItemAsync('worker_auth_credentials');
          if (stored) {
            const { email, password } = JSON.parse(stored);
            const { data: reAuthData, error: reAuthError } = await supabase.auth.signInWithPassword({ email, password });
            if (!reAuthError && reAuthData.session) {
              // onAuthStateChange will fire and call fetchUserDetailsAndCompany
              setIsLoading(false);
              return;
            } else {
              // Credentials are stale — clear them so we don't loop
              console.warn('AuthContext: silent re-auth failed, clearing stored credentials:', reAuthError?.message);
              await SecureStore.deleteItemAsync('worker_auth_credentials');
            }
          }
        } catch (e) {
          console.warn('AuthContext: error during silent re-auth:', e);
        }
      }

      setSession(null);
      setUser(null);
      setIsLoading(false);
      fetchUserDetailsAndCompany(null);
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
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable !== false;
    if (!isOnline) return; // Nothing to refresh offline — cached state is already loaded
    try {
      const { data: { session: refreshedSession }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError) return;
      const { data: { user: latestUser } } = await supabase.auth.getUser();
      if (latestUser) {
        setUser(latestUser);
        fetchUserDetailsAndCompany(latestUser);
      }
    } catch (err) {
      console.warn('refreshUser: network error, skipping refresh:', err);
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
      setUserScheduledWorkerSeats(null);
      setUserScheduledChangeEffectiveAt(null);
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
    userScheduledWorkerSeats,
    userScheduledChangeEffectiveAt,
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
