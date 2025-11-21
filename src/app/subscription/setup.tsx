import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import Slider from '@react-native-community/slider';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

const BASE_FEE = 19; // EUR/month
const WORKER_FEE = 5; // EUR/month per worker

export default function SubscriptionSetup() {
  const router = useRouter();
  const [workerCount, setWorkerCount] = useState(1);
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  useEffect(() => {
    setCalculatedPrice(BASE_FEE + workerCount * WORKER_FEE);
  }, [workerCount]);

  const handleContinue = () => {
    localStorage.setItem('subscriptionDetails', JSON.stringify({ workerCount, calculatedPrice }));
    router.push('/subscription/checkout-mock');
  };

  return (
    <AnimatedScreen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.description}>Select the number of workers to get your personalized pricing.</Text>

          <View style={styles.pricingSummary}>
            <Text style={styles.pricingText}>Base Fee: {BASE_FEE} EUR/month</Text>
            <Text style={styles.pricingText}>Worker Fee: {WORKER_FEE} EUR/month per worker</Text>
          </View>

          <View style={styles.workerCountContainer}>
            <Text style={styles.label}>Number of Workers: {workerCount}</Text>
            {Platform.OS === 'web' || Platform.OS === 'ios' || Platform.OS === 'android' ? (
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={200}
                step={1}
                value={workerCount}
                onValueChange={setWorkerCount}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.borderColor}
                thumbTintColor={theme.colors.primary}
              />
            ) : (
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(workerCount)}
                onChangeText={(text) => {
                  const num = parseInt(text);
                  if (!isNaN(num) && num >= 1 && num <= 200) {
                    setWorkerCount(num);
                  } else if (text === '') {
                    setWorkerCount(1); // Default to 1 if input is cleared
                  }
                }}
                onBlur={() => {
                  // Ensure a valid number is set on blur if text input is invalid
                  if (isNaN(workerCount) || workerCount < 1 || workerCount > 200) {
                    setWorkerCount(1);
                  }
                }}
              />
            )}
            
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Monthly Total:</Text>
            <Text style={styles.totalPrice}>{calculatedPrice} EUR</Text>
          </View>

          <Button
            onPress={handleContinue}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          >
            <Text style={styles.primaryButtonText}>Continue to Checkout</Text>
          </Button>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing(4),
  },
  content: {
    justifyContent: 'center',
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
  pricingSummary: {
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing(3),
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(4),
  },
  pricingText: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(1),
  },
  workerCountContainer: {
    marginBottom: theme.spacing(4),
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  input: {
    height: 50,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.headingText,
    backgroundColor: 'white',
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    marginTop: theme.spacing(4),
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(3),
    height: 50,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
