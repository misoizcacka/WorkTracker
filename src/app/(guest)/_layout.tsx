import { Stack } from 'expo-router';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';

export default function GuestLayout() {
  return (
    <I18nextProvider i18n={i18n}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="pricing" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="invalid-invite" options={{ headerShown: false }} />
        <Stack.Screen name="company-details" options={{ headerShown: false }} />
        <Stack.Screen name="signup-success" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
      </Stack>
    </I18nextProvider>
  );
}
