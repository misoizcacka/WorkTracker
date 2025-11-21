import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function SubscriptionSuccess() {
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'loading'>('loading');

  useEffect(() => {
    const subscriptionActive = localStorage.getItem('subscriptionActive');

    if (subscriptionActive === 'true') {
      setPaymentStatus('success');
      // Redirect to company details after a short delay
      const timer = setTimeout(() => {
        router.push('/onboarding/company-details');
      }, 3000); // 3-second delay
      return () => clearTimeout(timer); // Clean up the timer
    } else {
      setPaymentStatus('failed');
    }
  }, []);

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <View style={styles.content}>
          {paymentStatus === 'loading' && (
            <>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.message}>Processing payment...</Text>
            </>
          )}
          {paymentStatus === 'success' && (
            <>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successTitle}>Payment Successful!</Text>
              <Text style={styles.message}>You're all set. Redirecting to company setup...</Text>
            </>
          )}
          {paymentStatus === 'failed' && (
            <>
              <Text style={styles.errorIcon}>❌</Text>
              <Text style={styles.errorTitle}>Payment Failed (Mock)</Text>
              <Text style={styles.message}>Please try again or contact support.</Text>
            </>
          )}
        </View>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing(4),
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
    backgroundColor: 'white',
    marginHorizontal: 'auto',
    maxWidth: 500,
    width: '100%',
    borderRadius: theme.radius.lg,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      native: {
        elevation: 8,
      }
    }),
  },
  message: {
    fontSize: 18,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginTop: theme.spacing(2),
  },
  successIcon: {
    fontSize: 60,
    marginBottom: theme.spacing(2),
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.success,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: theme.spacing(2),
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
});