import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/Button';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';

export default function PaymentCancel() {
  const router = useRouter();

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Payment Cancelled</Text>
        <Text style={styles.text}>Your payment was not completed. Please try again or contact support if you continue to experience issues.</Text>
        <Button
          title="Return to Subscription Setup"
          onPress={() => router.replace('/subscription/setup')}
          style={styles.button}
        />
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
  button: {
    marginTop: theme.spacing(2),
  },
});
