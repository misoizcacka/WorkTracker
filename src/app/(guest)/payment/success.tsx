import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, Platform, Image, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../utils/supabase';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { useSession } from '../../../context/AuthContext';
import { Text } from '../../../components/Themed';
import { useTranslation } from 'react-i18next';
import { Logo } from '~/components/Logo';

const { width } = Dimensions.get('window');

export default function PaymentSuccess() {
  const { session_id } = useLocalSearchParams();
  const router = useRouter();
  const { refreshUser } = useSession();
  const { t } = useTranslation();

  const [status, setStatus] = useState('verifying');
  const [successType, setSuccessType] = useState<'new' | 'update'>('new');
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
        const genericErrorMessage = t('payment.genericVerificationError', 'Payment verification failed due to an internal error. Please try again or contact support.');
        if (funcError.message.includes('Edge Function returned a non-2xx status code') || funcError.message.includes('Function threw an error')) {
            throw new Error(genericErrorMessage);
        }
        throw funcError;
      }

      if (data.status === 'success') {
        // Essential: Refresh the local session state to see new worker_seats immediately
        await refreshUser();
        
        const isUpdate = data.type === 'seat_increase';
        setSuccessType(isUpdate ? 'update' : 'new');
        setStatus('success');

        if (Platform.OS === 'web') {
          localStorage.removeItem('pendingSubscription');
        }
      } else {
        setStatus('failed');
        setError(data.message || t('payment.verificationFailed', 'Payment verification failed.'));
      }
    } catch (err: any) {
      console.error("Verification Error:", err);
      setStatus('failed');
      const errorMessage = err.message || t('payment.verificationError', 'An unexpected error occurred during verification.');
      
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
        const isUpdate = successType === 'update';
        return (
          <>
            <View style={styles.iconCircle}>
                <Text style={styles.statusIcon}>✅</Text>
            </View>
            <Text style={styles.title} fontType='bold'>
                {isUpdate ? 'Capacity Updated!' : t('payment.successTitle', 'Payment Successful!')}
            </Text>
            <Text style={styles.description} fontType='regular'>
                {isUpdate 
                    ? 'Your new worker seats are now active and ready to use.'
                    : t('payment.successDescription', 'Your payment was successful. Click below to continue to your company setup.')
                }
            </Text>
            <Button
              title={isUpdate ? 'Back to Account' : t('payment.continueToSetup', 'Continue to Company Setup')}
              onPress={() => router.replace(isUpdate ? '/(manager)/account' : '/(manager)/company-setup')}
              style={styles.ctaButton}
            />
          </>
        );
      case 'failed':
        return (
          <>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.errorBackground }]}>
                <Text style={styles.statusIcon}>❌</Text>
            </View>
            <Text style={styles.title} fontType='bold'>{t('payment.failedTitle', 'Payment Failed')}</Text>
            <View style={styles.errorContainer}>
                <Text style={styles.errorText} fontType='regular'>{error}</Text>
            </View>
            <Button
              title={t('payment.tryAgain', 'Try Again')}
              onPress={() => router.replace(isUpdate ? '/(manager)/account' : '/subscription/setup')}
              style={styles.ctaButton}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        {/* Header with Logo in top left */}
        <View style={styles.header}>
          <Logo style={styles.logo} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.mainContent}>
            <Card style={styles.statusCard}>
                {renderContent()}
            </Card>
          </View>
        </ScrollView>

        <View style={styles.footer}>
            <Text style={styles.footerText} fontType="regular">© {new Date().getFullYear()} Koord. {t('common.allRightsReserved')}</Text>
        </View>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: theme.spacing(4),
    zIndex: 10,
  },
  logo: {
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing(3),
    paddingTop: theme.spacing(12),
    paddingBottom: theme.spacing(8),
  },
  mainContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  statusCard: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.xl,
    padding: theme.spacing(5),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    alignItems: 'center',
    ...Platform.select({
        web: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
        },
        native: {
            elevation: 10,
        },
    }),
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5', // Light green
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
  },
  statusIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  description: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
    lineHeight: 24,
  },
  statusText: {
    fontSize: 18,
    color: theme.colors.bodyText,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: theme.colors.errorBackground,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.errorText,
    width: '100%',
  },
  errorText: {
    color: theme.colors.errorText,
    textAlign: 'center',
    fontSize: 14,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    width: '100%',
    height: 52,
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(3),
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.disabledText,
  },
});
