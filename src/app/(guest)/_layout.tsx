import { Stack, useRouter, useSegments } from 'expo-router';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../../theme';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function GuestLayout() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Restrict access to guest pages on native platforms (iOS/Android)
    // Only allow 'login'
    if (Platform.OS !== 'web') {
      const currentSegment = segments[segments.length - 1];
      
      // If we are in the guest group but not on the login page
      // segments usually looks like ["(guest)", "index"] or ["(guest)", "pricing"]
      if (segments[0] === '(guest)' && currentSegment !== 'login') {
        console.log(`Restricting access to ${currentSegment} on mobile. Redirecting to login.`);
        router.replace('/(guest)/login');
      }
    }
  }, [segments, router]);

  return (
    <I18nextProvider i18n={i18n}>
      <StatusBar style="dark" backgroundColor={theme.colors.pageBackground} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="pricing" />
        <Stack.Screen name="login" />
        <Stack.Screen name="invalid-invite" />
        <Stack.Screen name="company-details" />
        <Stack.Screen name="signup-success" />
        <Stack.Screen name="register" />
      </Stack>
    </I18nextProvider>
  );
}
