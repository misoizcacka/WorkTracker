import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="invite" options={{ headerShown: false }} />
    </Stack>
  );
}
