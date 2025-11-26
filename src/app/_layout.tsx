import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SessionProvider, useSession } from '../context/AuthContext';
import { WorkersProvider } from './(manager)/WorkersContext';
import { InvitesProvider } from './(manager)/InvitesContext';

import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

export default function RootLayout() {
  return (
    <SessionProvider>
      <I18nextProvider i18n={i18n}>
        <WorkersProvider>
          <InvitesProvider>
            <Main />
          </InvitesProvider>
        </WorkersProvider>
      </I18nextProvider>
    </SessionProvider>
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

    // This is the new check for the payment processing pages
    const inPaymentFlow = segments.includes('payment');

    if (subscriptionStatus !== 'active') {
      // No active subscription.
      if (segments[0] !== 'subscription' && segments[0] !== 'onboarding' && !inPaymentFlow) {
        router.replace('/subscription/setup');
      }
    } else {
      // Active subscription.
      if (!inApp) {
        const role = user.app_metadata.role || user.user_metadata.role;
        router.replace(role === 'manager' ? '/(manager)/dashboard' : '/(worker)/home');
      }
    }
  }, [user, segments, isLoading]);

  return (
    <Stack>
      <Stack.Screen name="(guest)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="subscription" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(manager)" options={{ headerShown: false }} />
    </Stack>
  );
}