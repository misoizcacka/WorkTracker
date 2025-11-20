import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, ScrollView } from 'react-native';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';
import { PixelatedBackground } from '../../components/PixelatedBackground';
import { useRouter } from 'expo-router';

export default function Payment() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleGoToLogin = () => {
    router.push('/(guest)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <PixelatedBackground />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('payment.title')}</Text>
          <Text style={styles.description}>{t('payment.description')}</Text>

          <Button
            title={t('payment.goToLoginButton')}
            onPress={handleGoToLogin}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
    padding: theme.spacing(4),
    backgroundColor: 'white',
    marginHorizontal: 'auto',
    maxWidth: 500,
    width: '100%',
    borderRadius: theme.radius.md,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  description: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
