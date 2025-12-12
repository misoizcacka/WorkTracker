import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '~/context/AuthContext';
import AnimatedScreen from '~/components/AnimatedScreen';
import { theme } from '~/theme';

export default function SetupComplete() {
  const { user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (user?.user_metadata?.company_setup_complete) {
      router.replace('/(manager)/dashboard');
    }
  }, [user, router]);

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.text}>Finalizing your setup...</Text>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
  },
  text: {
    marginTop: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.bodyText,
  },
});