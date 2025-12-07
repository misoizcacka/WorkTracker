import React, { useEffect } from 'react';
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

export default function RootLayout() {
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
  const { user, isLoading } = useSession()!;
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(guest)' || segments[0] === 'auth';

    if (!user) {
      // Not logged in.
      if (!inAuthGroup) {
        router.replace('/(guest)/login');
      }
      return;
    }

    // User is logged in.
    const inApp = segments[0] === '(manager)' || segments[0] === '(worker)';
    const subscriptionStatus = user.app_metadata?.subscription_status;
    const userRole = user.app_metadata?.role || user.user_metadata.role; // Get user's actual role

    // This is the new check for the payment processing pages
    const inPaymentFlow = segments.includes('payment');

    // If owner or manager without active subscription, redirect to subscription setup.
    if ((userRole === 'manager' || userRole === 'owner') && subscriptionStatus !== 'active') {
      // Ensure they are not already on a subscription/onboarding/payment page
      if (segments[0] !== 'subscription' && segments[0] !== 'onboarding' && !inPaymentFlow) {
        router.replace('/subscription/setup');
      }
    } else {
      // If manager/owner has active subscription OR if user is a worker,
      // redirect them to their respective app dashboards if they are not already in app
      if (!inApp) {
        // Redirect owner/manager to dashboard, worker to worker home
        router.replace(userRole === 'worker' ? '/(worker)/home' : '/(manager)/dashboard');
      }
    }
  }, [user, segments, isLoading]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.cardBackground }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Stack screenOptions={{
        headerShown: false,
      }}>
        <Stack.Screen name="(guest)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(manager)" />
        <Stack.Screen name="(worker)" />
      </Stack>
    </SafeAreaView>
  );
}
