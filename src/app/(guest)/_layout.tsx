import { Stack } from 'expo-router';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../../theme';

export default function GuestLayout() {
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
