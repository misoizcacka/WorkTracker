import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../utils/supabase';
import { Button } from '../../../components/Button';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { useSession } from '../../../context/AuthContext'; // Import useSession

export default function PaymentSuccess() {
  const { session_id } = useLocalSearchParams();
  const router = useRouter();
  const { refreshUser } = useSession(); // Get refreshUser from useSession
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (session_id) {
      verifyPayment();
    } else {
      setStatus('failed');
      setError('No session ID provided.');
    }
  }, [session_id]);

  const verifyPayment = async () => {
    setStatus('verifying');
    try {
      const { data, error: funcError } = await supabase.functions.invoke('verify-checkout-session', {
        body: { session_id },
      });

      if (funcError) {
        throw funcError;
      }

      if (data.status === 'success') {
        await refreshUser(); // Refresh user data in the session context
        setStatus('success');
        localStorage.removeItem('pendingSubscription');
        router.replace('/(manager)/company-setup'); // Correct redirect to company setup
      } else {
        setStatus('failed');
        setError('Payment verification failed.');
      }
    } catch (err: any) {
      setStatus('failed');
      setError(err.message || 'An error occurred during verification.');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.text}>Verifying your payment...</Text>
          </>
        );
      case 'success':
        return (
          <>
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.text}>Redirecting to company setup...</Text>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </>
        );
      case 'failed':
        return (
          <>
            <Text style={styles.title}>Payment Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title="Try Again"
              onPress={() => router.replace('/subscription/setup')}
              style={styles.button}
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
        {renderContent()}
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(2),
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: theme.spacing(2),
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    marginBottom: theme.spacing(4),
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.danger,
    marginBottom: theme.spacing(4),
    textAlign: 'center',
  },
  button: {
    marginTop: theme.spacing(2),
  },
});
