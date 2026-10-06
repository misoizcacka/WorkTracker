import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StoreButtons } from '../../components/StoreButtons';
import { View as ThemedView, Text } from '../../components/Themed';
import { Button } from '../../components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';

export default function SignupSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Text style={styles.icon}>🎉</Text>
        <Text style={styles.title} fontType="bold">{t('signupSuccess.title')}</Text>
        <Text style={styles.subtitle} fontType="regular">
          {t('signupSuccess.subtitle')}
        </Text>

        <StoreButtons />

        <View style={styles.buttonContainer}>
          <Button
            type="secondary"
            onPress={() => router.replace('/(guest)/login')}
          >
            <Text fontType="regular">{t('signupSuccess.laterLink')}</Text>
          </Button>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: theme.spacing(3),
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: theme.spacing(2),
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
    color: theme.colors.headingText,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(3),
    maxWidth: 320,
    lineHeight: 24,
  },
  buttonContainer: {
    marginTop: theme.spacing(2),
    width: '100%',
  },
});
