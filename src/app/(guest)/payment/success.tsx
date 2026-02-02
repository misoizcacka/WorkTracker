import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, Platform, Image, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { supabase } from '../../../utils/supabase';
import { Button } from '../../../components/Button';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { useSession } from '../../../context/AuthContext';
import { Text } from '../../../components/Themed';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function PaymentSuccess() {
  const { session_id } = useLocalSearchParams();
  const router = useRouter();
  const { refreshUser } = useSession();
  const { t } = useTranslation();

  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (session_id) {
      verifyPayment();
    } else {
      setStatus('failed');
      setError(t('payment.noSessionId', 'No session ID provided.'));
    }
  }, [session_id]);

  const verifyPayment = async () => {
    setStatus('verifying');
    try {
      const { data, error: funcError } = await supabase.functions.invoke('verify-checkout-session', {
        body: { session_id },
      });

      if (funcError) {
        // Check for specific technical error messages from Supabase Edge Functions
        const genericErrorMessage = t('payment.genericVerificationError', 'Payment verification failed due to an internal error. Please try again or contact support.');
        if (funcError.message.includes('Edge Function returned a non-2xx status code') || funcError.message.includes('Function threw an error')) {
            throw new Error(genericErrorMessage);
        }
        throw funcError; // Re-throw other errors
      }

      if (data.status === 'success') {
        await refreshUser();
        setStatus('success');
        if (Platform.OS === 'web') {
          localStorage.removeItem('pendingSubscription');
        }
        // No automatic redirect, let user click to continue
      } else {
        setStatus('failed');
        setError(data.message || t('payment.verificationFailed', 'Payment verification failed.'));
      }
    } catch (err: any) {
      setStatus('failed');
      const errorMessage = err.message || t('payment.verificationError', 'An unexpected error occurred during verification.');
      
      // Ensure specific technical errors are generalized
      const genericErrorMessage = t('payment.genericVerificationError', 'Payment verification failed due to an internal error. Please try again or contact support.');
      if (errorMessage.includes('Edge Function returned a non-2xx status code') || errorMessage.includes('Function threw an error')) {
        setError(genericErrorMessage);
      } else {
        setError(errorMessage);
      }
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <>
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: theme.spacing(3) }}/>
            <Text style={styles.statusText} fontType='medium'>{t('payment.verifying', 'Verifying your payment...')}</Text>
          </>
        );
      case 'success':
        return (
          <>
            <Text style={styles.title} fontType='bold'>{t('payment.successTitle', 'Payment Successful!')}</Text>
            <Text style={styles.description}>{t('payment.successDescription', 'Your payment was successful. Click below to continue to your company setup.')}</Text>
            <Button
              title={t('payment.continueToSetup', 'Continue to Company Setup')}
              onPress={() => router.replace('/(manager)/company-setup')}
              style={styles.ctaButton}
              textStyle={styles.ctaButtonText}
            />
          </>
        );
      case 'failed':
        return (
          <>
            <Text style={styles.title} fontType='bold'>{t('payment.failedTitle', 'Payment Failed')}</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title={t('payment.tryAgain', 'Try Again')}
              onPress={() => router.replace('/(guest)/pricing')}
              style={styles.ctaButton}
              textStyle={styles.ctaButtonText}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatedScreen backgroundColor={theme.colors.background}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
            <Link href="/(guest)" asChild>
                <Image
                source={require('../../../../assets/logokoordblack.png')}
                style={styles.logo}
                resizeMode="contain"
                />
            </Link>
        </View>

        <View style={styles.mainContent}>
            <View style={styles.card}>
                {renderContent()}
            </View>
        </View>

        <View style={styles.footer}>
            <Text style={styles.footerText} fontType="regular">© {new Date().getFullYear()} WorkHoursTracker. {t('common.allRightsReserved')}</Text>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    ...Platform.select({
        web: {
          width: '100%',
          maxWidth: 1400,
          alignSelf: 'center',
        },
    }),
  },
  logo: {
    width: 100,
    height: 30,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
  },
  card: {
    width: '100%',
    maxWidth: 500,
    padding: theme.spacing(5),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    alignItems: 'center',
    ...Platform.select({
        web: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
        },
        native: {
            elevation: 6,
        },
    }),
  },
  title: {
    fontSize: isLargeScreen ? 32 : 28,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(2),
  },
  description: {
    fontSize: isLargeScreen ? 18 : 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
    maxWidth: 600,
  },
  statusText: {
    fontSize: 18,
    color: theme.colors.bodyText,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.errorText,
    backgroundColor: theme.colors.errorBackground,
    padding: theme.spacing(2),
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(4),
    textAlign: 'center',
    width: '100%',
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(5),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.lg,
    width: '100%',
    alignItems: 'center',
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    padding: theme.spacing(5),
    backgroundColor: theme.colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    alignItems: 'center',
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.bodyText,
  },
});