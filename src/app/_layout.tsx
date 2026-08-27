import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react'; // Added useState, useCallback
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
    <BaseToast
      {...props}
      style={{ 
        borderLeftColor: theme.colors.success,
        backgroundColor: 'white',
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        height: 'auto',
        minHeight: 60,
        paddingVertical: 10,
        ...Platform.select({
          web: {
            boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
          }
        })
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: theme.fontSizes.md,
        fontFamily: theme.font['bold'],
        color: theme.colors.headingText
      }}
      text2Style={{
        fontSize: theme.fontSizes.sm,
        fontFamily: theme.font['regular'],
        color: theme.colors.bodyText
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ 
        borderLeftColor: theme.colors.danger,
        backgroundColor: 'white',
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        height: 'auto',
        minHeight: 60,
        paddingVertical: 10,
        ...Platform.select({
          web: {
            boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
          }
        })
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: theme.fontSizes.md,
        fontFamily: theme.font['bold'],
        color: theme.colors.headingText
      }}
      text2Style={{
        fontSize: theme.fontSizes.sm,
        fontFamily: theme.font['regular'],
        color: theme.colors.bodyText
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ 
        borderLeftColor: theme.colors.secondary,
        backgroundColor: 'white',
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        height: 'auto',
        minHeight: 60,
        paddingVertical: 10,
        ...Platform.select({
          web: {
            boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
          }
        })
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: theme.fontSizes.md,
        fontFamily: theme.font['bold'],
        color: theme.colors.headingText
      }}
      text2Style={{
        fontSize: theme.fontSizes.sm,
        fontFamily: theme.font['regular'],
        color: theme.colors.bodyText
      }}
    />
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

  // Re-render the entire tree when language changes so hardcoded strings update
  const [langKey, setLangKey] = useState(i18n.language);
  useEffect(() => {
    const handler = (lng: string) => setLangKey(lng);
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      loadPersistedLanguage();
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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
    const { user, isLoading, userCompanyId, isCompanyIdLoading, userRole, isCompanyDetailsComplete } = useSession()!;
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
      if (isLoading || isCompanyIdLoading) return;

      const inAuthGroup = segments[0] === '(guest)' || segments[0] === 'auth' || segments[0] === 'onboarding' || segments[0] === 'join';
      const inPaymentFlow = segments[0] === '(guest)' && segments.includes('payment');
      const inSubscriptionFlow = segments[0] === 'subscription';
      const inManagerApp = segments[0] === '(manager)';
      const inWorkerApp = segments[0] === '(worker)';
      const inMobileOnly = segments[0] === 'mobile-only';

      // 1. Not logged in → guest
      if (!user) {
        if (!inAuthGroup) {
          router.replace(Platform.OS !== 'web' ? '/(guest)/login' : '/(guest)/');
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
      //    But never interrupt an active payment flow or subscription flow
      if (userRole === 'owner' && subscriptionStatus !== 'active') {
        if (!inSubscriptionFlow && !inPaymentFlow) {
          router.replace('/subscription/setup');
        }
        return;
      }

      // 4. Owner with subscription but company not set up → company-setup
      //    But never interrupt if they're already in the manager app or payment flow
      if (userRole === 'owner' && subscriptionStatus === 'active' && !companySetupComplete) {
        if (!inManagerApp && !inPaymentFlow && !inSubscriptionFlow) {
          router.replace('/(manager)/company-setup');
        }
        return;
      }

      // 5. Fully set up → send to app if not already there
      if (user && userRole) {
        if (!inManagerApp && !inWorkerApp && !inMobileOnly) {
          router.replace(userRole === 'worker' ? '/(worker)/home' : '/(manager)/dashboard');
        }
      }
    }, [user, segments, isLoading, isCompanyIdLoading, userRole, userCompanyId, isCompanyDetailsComplete]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}>
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
