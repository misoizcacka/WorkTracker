import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../theme';

export default function LegacyInviteRedirect() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!token || Array.isArray(token)) {
      router.replace('/join');
      return;
    }

    router.replace(`/join/${token}`);
  }, [router, token]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.pageBackground }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}
