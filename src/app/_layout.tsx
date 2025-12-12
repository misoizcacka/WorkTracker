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
    const { user, isLoading, userCompanyId, isCompanyIdLoading, userRole } = useSession()!;
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
      if (isLoading) return; // Overall auth session is still loading

      // If user is logged in, and it's a manager/owner, we need company ID to be loaded
      // Check if user is logged in and not a worker
      if (user && (user.user_metadata?.role === 'manager' || user.user_metadata?.role === 'owner')) {
        // If company ID is still loading, or if it's finished loading but we couldn't find a company ID,
        // then we must wait or show an error state.
        if (isCompanyIdLoading || userCompanyId === null) {
          // If we are already on the subscription setup page, don't redirect (to prevent a loop)
          const currentPath = segments.join('/');
          if (!currentPath.startsWith('subscription/setup')) {
            // This should ideally redirect to a loading state or a specific error page
            // For now, we will block routing until company ID is resolved.
            // In a real app, you might want a specific loading component here.
            return;
          }
        }
      }

      // ADDED: Block workers from web app
      if (Platform.OS === 'web' && user) {
        if (userRole === 'worker') {
          router.replace('/mobile-only');
          return;
        }
      }

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
      // userRole is already available from useSession()
      // This is the new check for the payment processing pages
      const inPaymentFlow = segments.includes('payment');

      const companySetupComplete = user.user_metadata?.company_setup_complete || false;

      const isOnCompanySetupPage = segments[0] === '(manager)' && segments.length > 1 && (segments as any)[1] === 'company-setup';

      // If owner or manager without active subscription, redirect to subscription setup.
      if ((userRole === 'manager' || userRole === 'owner') && subscriptionStatus !== 'active') {
        // Ensure they are not already on a subscription/onboarding/payment page
        if (segments[0] !== 'subscription' && segments[0] !== 'onboarding' && !inPaymentFlow) {
          router.replace('/subscription/setup');
        }
      } else if ((userRole === 'manager' || userRole === 'owner') && subscriptionStatus === 'active' && !companySetupComplete) {
        if (!isOnCompanySetupPage) {
          router.replace('/(manager)/company-setup');
        }
                      } else if (user && userRole) { // ADDED: Ensure user and userRole are determined before redirecting
            // If manager/owner has active subscription and company setup is complete OR if user is a worker,
            // redirect them to their respective app dashboards if they are not already in app
            if (!inApp) {
              // Redirect owner/manager to dashboard, worker to worker home
              router.replace(userRole === 'worker' ? '/(worker)/home' : '/(manager)/dashboard');
            }
          }    }, [user, segments, isLoading, userRole]);

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