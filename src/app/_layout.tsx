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
import i18n from '../i18n';
import { theme } from '../theme';

import Toast from 'react-native-toast-message';

// Register the background task
import '../tasks/locationHeartbeatTask';

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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'WorkSans-Thin': WorkSans_100Thin,
    'WorkSans-Light': WorkSans_300Light,
    'WorkSans-Regular': WorkSans_400Regular,
    'WorkSans-Bold': WorkSans_700Bold, // Map 'WorkSans-Bold' to 700
    // Add other fonts if necessary
  });

  useEffect(() => {
    if (fontsLoaded) {
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
        <I18nextProvider i18n={i18n}>
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
      <Toast />
    </SafeAreaProvider>
  );
}

  function Main() {
    const { user, isLoading, userCompanyId, isCompanyIdLoading, userRole } = useSession()!;
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
      if (isLoading) return;

      if (user && (user.user_metadata?.role === 'manager' || user.user_metadata?.role === 'owner')) {
        if (isCompanyIdLoading || userCompanyId === null) {
          const currentPath = segments.join('/');
          if (!currentPath.startsWith('subscription/setup')) {
            return;
          }
        }
      }

      if (Platform.OS === 'web' && user) {
        if (userRole === 'worker') {
          router.replace('/mobile-only');
          return;
        }
      }

      const inAuthGroup = segments[0] === '(guest)' || segments[0] === 'auth';
      if (!user) {
        if (!inAuthGroup) {
          router.replace('/(guest)/');
        }
        return;
      }

      const inApp = segments[0] === '(manager)' || segments[0] === '(worker)';
      const subscriptionStatus = user.app_metadata?.subscription_status;
      const inPaymentFlow = segments.includes('payment');

      const companySetupComplete = user.user_metadata?.company_setup_complete || false;

      const isOnCompanySetupPage = segments[0] === '(manager)' && segments.length > 1 && (segments as any)[1] === 'company-setup';

      if ((userRole === 'manager' || userRole === 'owner') && subscriptionStatus !== 'active') {
        if (segments[0] !== 'subscription' && segments[0] !== 'onboarding' && !inPaymentFlow) {
          router.replace('/subscription/setup');
        }
      } else if ((userRole === 'manager' || userRole === 'owner') && subscriptionStatus === 'active' && !companySetupComplete) {
        if (!isOnCompanySetupPage) {
          router.replace('/(manager)/company-setup');
        }
      } else if (user && userRole) {
        if (!inApp) {
          router.replace(userRole === 'worker' ? '/(worker)/home' : '/(manager)/dashboard');
        }
      }
    }, [user, segments, isLoading, userRole, userCompanyId, isCompanyIdLoading]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Stack screenOptions={{
        headerShown: false,
      }}>
        <Stack.Screen name="(guest)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(manager)" />
        <Stack.Screen name="(worker)" />
      </Stack>
    </SafeAreaView>
  );
}