import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback, useRef } from 'react'; // Added useState, useCallback, useRef
import { Stack, useRouter, useSegments } from 'expo-router';
import { SessionProvider, useSession } from '../context/AuthContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { EmployeesProvider } from '../context/EmployeesContext';
import { ProjectsProvider } from '../context/ProjectsContext';
import { AssignmentsProvider } from '../context/AssignmentsContext';
import { InvitesProvider } from '../context/InvitesContext';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { I18nextProvider } from 'react-i18next';
import i18n, { loadPersistedLanguage } from '../i18n';
import { theme } from '../theme';

import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';

// Import specific font weights from @expo-google-fonts/work-sans
import {
  WorkSans_100Thin,
  WorkSans_300Light,
  WorkSans_400Regular,
  WorkSans_700Bold, // Re-add WorkSans_700Bold
} from '@expo-google-fonts/work-sans';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const toastConfig: ToastConfig = {
  success: (props) => (
    <View style={{ position: 'relative', marginHorizontal: 16, width: '90%', maxWidth: 400, alignSelf: 'center' }}>
      <BaseToast
        {...props}
        style={{ 
          borderLeftColor: 'transparent',
          backgroundColor: '#d1fae5', // Fully opaque green
          borderRadius: theme.radius.xl,
          borderWidth: 0,
          height: 'auto',
          minHeight: 60,
          paddingVertical: 12,
          overflow: 'hidden',
          ...Platform.select({
            web: {
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
            },
            default: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
            },
          }),
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{
          fontSize: 15,
          fontFamily: theme.font['bold'],
          color: '#065f46',
          letterSpacing: -0.2,
        }}
        text2Style={{
          fontSize: 14,
          fontFamily: theme.font['regular'],
          color: '#047857',
          letterSpacing: -0.1,
        }}
      />
      {/* iOS-style glossy shine */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
        pointerEvents: 'none',
      }} />
    </View>
  ),
  error: (props) => (
    <View style={{ position: 'relative', marginHorizontal: 16, width: '90%', maxWidth: 400, alignSelf: 'center' }}>
      <ErrorToast
        {...props}
        style={{ 
          borderLeftColor: 'transparent',
          backgroundColor: '#fee2e2', // Fully opaque red
          borderRadius: theme.radius.xl,
          borderWidth: 0,
          height: 'auto',
          minHeight: 60,
          paddingVertical: 12,
          overflow: 'hidden',
          ...Platform.select({
            web: {
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
            },
            default: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
            },
          }),
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{
          fontSize: 15,
          fontFamily: theme.font['bold'],
          color: '#7f1d1d',
          letterSpacing: -0.2,
        }}
        text2Style={{
          fontSize: 14,
          fontFamily: theme.font['regular'],
          color: '#991b1b',
          letterSpacing: -0.1,
        }}
      />
      {/* iOS-style glossy shine */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
        pointerEvents: 'none',
      }} />
    </View>
  ),
  info: (props) => (
    <View style={{ position: 'relative', marginHorizontal: 16, width: '90%', maxWidth: 400, alignSelf: 'center' }}>
      <BaseToast
        {...props}
        style={{ 
          borderLeftColor: 'transparent',
          backgroundColor: '#dbeafe', // Fully opaque blue
          borderRadius: theme.radius.xl,
          borderWidth: 0,
          height: 'auto',
          minHeight: 60,
          paddingVertical: 12,
          overflow: 'hidden',
          ...Platform.select({
            web: {
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
            },
            default: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
            },
          }),
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{
          fontSize: 15,
          fontFamily: theme.font['bold'],
          color: '#1e3a8a',
          letterSpacing: -0.2,
        }}
        text2Style={{
          fontSize: 14,
          fontFamily: theme.font['regular'],
          color: '#1e40af',
        }}
      />
      {/* Glossy shine overlay */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)',
        borderTopLeftRadius: theme.radius.lg,
        borderTopRightRadius: theme.radius.lg,
        pointerEvents: 'none',
        ...(Platform.OS === 'web' ? {} : { display: 'none' }),
      }} />
    </View>
  )
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'WorkSans-Thin': WorkSans_100Thin,
    'WorkSans-Light': WorkSans_300Light,
    'WorkSans-Regular': WorkSans_400Regular,
    'WorkSans-Bold': WorkSans_700Bold, // Map 'WorkSans-Bold' to 700
    // Add other fonts if necessary
  });

  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Re-render the entire tree when language changes so hardcoded strings update
  const [langKey, setLangKey] = useState(i18n.language);
  useEffect(() => {
    const handler = (lng: string) => setLangKey(lng);
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, []);

  // Preload images and icon fonts before showing the app
  useEffect(() => {
    async function preload() {
      try {
        await Promise.all([
          Asset.loadAsync([
            require('../../assets/koordinatelogo.png'),
            require('../../assets/koordinateappicon.png'),
            require('../../assets/koordsplashscreen.png'),
          ]),
          Ionicons.loadFont(),
        ]);
      } catch (e) {
        console.warn('Asset preload error:', e);
      } finally {
        setAssetsLoaded(true);
      }
    }
    preload();
  }, []);

  useEffect(() => {
    if (fontsLoaded && assetsLoaded) {
      loadPersistedLanguage();
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, assetsLoaded]);

  useEffect(() => {
    if (fontError) {
      console.error('Error loading fonts:', fontError);
      SplashScreen.hideAsync();
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }


  return (
    <SafeAreaProvider>
      <SessionProvider>
        <I18nextProvider i18n={i18n} key={langKey}>
          <EmployeesProvider>
            <ProjectsProvider>
              <AssignmentsProvider>
                <InvitesProvider>
                  <Main />
                </InvitesProvider>
              </AssignmentsProvider>
            </ProjectsProvider>
          </EmployeesProvider>
        </I18nextProvider>
      </SessionProvider>
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}

  function Main() {
    const { user, isLoading, userCompanyId, isCompanyIdLoading, userRole, isCompanyDetailsComplete, refreshUser } = useSession()!;
    const segments = useSegments();
    const router = useRouter();
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);

    // Handle post-verification company creation
    useEffect(() => {
      const setupCompanyAfterVerification = async () => {
        if (isCreatingCompany) return;
        if (!user || !user.email_confirmed_at) return;
        if (userRole !== 'owner') return;
        if (userCompanyId) return;
        if (isCompanyIdLoading) return;

        setIsCreatingCompany(true);
        
        try {
          const { supabase } = await import('../utils/supabase');
          const { logConsent } = await import('../services/consent');
          
          // Check if company already exists
          const { data: existingEmployee } = await supabase
            .from('employees')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle();

          if (existingEmployee?.company_id) {
            await refreshUser();
            router.replace('/subscription/setup');
            return;
          }

          // Log GDPR consent
          await Promise.all([
            logConsent({ userId: user.id, consentType: 'terms' }),
            logConsent({ userId: user.id, consentType: 'privacy' }),
            logConsent({ userId: user.id, consentType: 'dpa' }),
          ]);

          // Get current session to ensure JWT is fresh
          const { data: sessionData } = await supabase.auth.getSession();
          console.log('[Edge Function Call] Has session:', !!sessionData.session);
          console.log('[Edge Function Call] User email confirmed:', user.email_confirmed_at);

          const { data, error } = await supabase.functions.invoke('create-owner-and-company', {
            body: {
              userId: user.id,
              fullName: user.user_metadata?.full_name ?? '',
              email: user.email ?? '',
              companyName: 'New Company',
            },
          });

          if (error) {
            console.error('[Edge Function Call] Error:', error);
            await refreshUser();
            router.replace('/subscription/setup');
          } else {
            console.log('[Edge Function Call] Success:', data);
            await refreshUser();
            router.replace(data?.company?.id
              ? { pathname: '/subscription/setup', params: { companyId: data.company.id } }
              : '/subscription/setup'
            );
          }
        } catch (err) {
          await refreshUser();
          router.replace('/subscription/setup');
        } finally {
          setIsCreatingCompany(false);
        }
      };

      setupCompanyAfterVerification();
    }, [user, userCompanyId, isCompanyIdLoading, userRole, isCreatingCompany]);

    const lastRouteCheckRef = useRef<string>('');
    
    useEffect(() => {
      if (isLoading || isCompanyIdLoading) return;

      const inAuthGroup = segments[0] === '(guest)' || segments[0] === 'auth' || segments[0] === 'onboarding' || segments[0] === 'join';
      const inPaymentFlow = segments[0] === '(guest)' && segments.includes('payment');
      const inPaymentSuccess = inPaymentFlow && segments.includes('success');
      const inSubscriptionFlow = segments[0] === 'subscription';
      const inManagerApp = segments[0] === '(manager)';
      const inWorkerApp = segments[0] === '(worker)';
      const inMobileOnly = segments[0] === 'mobile-only';
      const onCompanySetup = inManagerApp && segments[1] === 'company-setup';
      
      // Create a fingerprint of the current state to prevent unnecessary re-runs
      const stateFingerprint = `${segments.join('/')}_${userRole}_${user?.app_metadata?.subscription_status}_${isCompanyDetailsComplete}_${!!user}`;
      if (lastRouteCheckRef.current === stateFingerprint) {
        return;
      }
      lastRouteCheckRef.current = stateFingerprint;

      // 1. Not logged in → guest
      if (!user) {
        if (!inAuthGroup) {
          router.replace(Platform.OS !== 'web' ? '/(guest)/login' : '/(guest)/');
        }
        return;
      }

      // 1b. Logged in but email not verified → verify-email screen
      if (user && !user.email_confirmed_at) {
        const inVerifyEmail = segments[0] === 'auth' && segments[1] === 'verify-email';
        if (!inVerifyEmail) {
          router.replace({
            pathname: '/auth/verify-email',
            params: { email: user.email ?? '' }
          });
        }
        return;
      }

      // 2. Worker on web → mobile-only
      if (Platform.OS === 'web' && userRole === 'worker' && !inMobileOnly) {
        router.replace('/mobile-only');
        return;
      }

      const subscriptionStatus = user.app_metadata?.subscription_status;
      const companySetupComplete = isCompanyDetailsComplete || !!user.user_metadata?.company_setup_complete;

      // 3. Owner without subscription → subscription setup
      if (userRole === 'owner' && subscriptionStatus !== 'active') {
        if (!inSubscriptionFlow && !inPaymentFlow) {
          router.replace('/subscription/setup');
        }
        return;
      }

      // 3b. On payment success page → don't redirect
      if (inPaymentSuccess) {
        return;
      }

      // 4. Owner with subscription but company not set up → company-setup
      if (userRole === 'owner' && subscriptionStatus === 'active' && !companySetupComplete) {
        if (!inManagerApp && !inPaymentFlow && !inSubscriptionFlow) {
          router.replace('/(manager)/company-setup');
        } else if (onCompanySetup) {
          // Already on company-setup, stay here
        }
        return;
      }

      // 5. Fully set up → send to app
      if (user && userRole) {
        if (!inManagerApp && !inWorkerApp && !inMobileOnly) {
          router.replace(userRole === 'worker' ? '/(worker)/home' : '/(manager)/dashboard');
        }
      }
    }, [user, segments, isLoading, isCompanyIdLoading, userRole, userCompanyId, isCompanyDetailsComplete]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.pageBackground }} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <Stack screenOptions={{
        headerShown: false,
      }}>
        <Stack.Screen name="(guest)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="join" options={{ headerShown: false }} />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(manager)" />
        <Stack.Screen name="(worker)" />
      </Stack>
    </SafeAreaView>
  );
}
