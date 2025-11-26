import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, ScrollView, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../context/AuthContext';
import { AntDesign } from '@expo/vector-icons'; // Import AntDesign for +/- icons
import { supabase } from '../../utils/supabase'; // Import supabase
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

const BASE_FEE = 19; // EUR/month
const WORKER_FEE = 5; // EUR/month per worker
const MAX_WORKERS = 200; // Increased maximum workers
const MIN_WORKERS = 1; // Minimum workers

// Placeholder for your backend endpoint
// In a real application, this should be an environment variable
// const CHECKOUT_SESSION_ENDPOINT = 'https://ofivipdtbweijzywpytd.supabase.co/functions/v1/create-checkout-session';

export default function SubscriptionSetup() {
  const { user } = useSession()!;
  const router = useRouter();
  const [workerCount, setWorkerCount] = useState(MIN_WORKERS);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCalculatedPrice(BASE_FEE + workerCount * WORKER_FEE);
  }, [workerCount]);

  const handleWorkerCountChange = (value: number) => {
    if (value >= MIN_WORKERS && value <= MAX_WORKERS) {
      setWorkerCount(value);
    }
  };

  const incrementWorkerCount = () => {
    if (workerCount < MAX_WORKERS) {
      setWorkerCount(workerCount + 1);
    }
  };

  const decrementWorkerCount = () => {
    if (workerCount > MIN_WORKERS) {
      setWorkerCount(workerCount - 1);
    }
  };

  const handleContinue = async () => {
    setError(null);
    setIsSubmitting(true);
    console.log("Analytics: Pricing selection proceeded to payment.");

    try {
      if (!user) {
        console.warn("Analytics: User not logged in, redirecting to signup.");
        Alert.alert("Authentication Required", "Please sign up or log in to proceed with payment.");
        router.push('/auth/signup');
        return;
      }
      const userId = user.id;

      if (!userId) {
        console.warn("Analytics: User ID not found, redirecting to signup.");
        Alert.alert("Authentication Error", "Could not retrieve user ID. Please sign up or log in again.");
        router.push('/auth/signup');
        return;
      }

      // Save chosen workerCount locally before redirecting
      localStorage.setItem('pendingSubscription', JSON.stringify({ workerCount, calculatedPrice }));

      // Call backend to create checkout session
      const { data, error: funcError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          userId,
          workerCount,
          currency: 'EUR',
          billingCycle: 'monthly',
        },
      });

      if (funcError) {
        throw funcError;
      }

      const { checkoutUrl } = data;
      if (checkoutUrl) {
        console.log("Analytics: Checkout session created, redirecting to Stripe.");
        // Redirect the browser to the Stripe checkout page
        if (Platform.OS === 'web') {
          window.location.assign(checkoutUrl);
        } else {
          // For native, you'd typically use Linking to open the URL externally
          // or a WebView. For simplicity here, we'll log it.
          Alert.alert("Redirect to Stripe", `Please open this URL to complete payment: ${checkoutUrl}`);
          console.log("Stripe Checkout URL:", checkoutUrl);
        }
      } else {
        console.error("Analytics: Backend did not return a checkout URL.");
        setError("Failed to initiate payment. Please try again.");
      }
    } catch (err: any) {
      console.error("Analytics: Error creating checkout session.", err.message);
      setError(err.message || "An error occurred while initiating payment.");
    } finally {
      setIsSubmitting(false);
      console.log("Analytics: Payment initiation request finished.");
    }
  };

  return (
    <AnimatedScreen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.description}>Select the number of workers to get your personalized pricing.</Text>

          {error && <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View>}

          <View style={styles.pricingSummary}>
            <Text style={styles.pricingText}>Base Fee: {BASE_FEE} EUR/month</Text>
            <Text style={styles.pricingText}>Worker Fee: {WORKER_FEE} EUR/month per worker</Text>
          </View>

          <View style={styles.workerCountContainer}>
            <Text style={styles.label}>Number of Workers: {workerCount}</Text>
            <View style={styles.workerCountControl}>
                <Pressable onPress={decrementWorkerCount} style={styles.workerCountButton} disabled={workerCount <= MIN_WORKERS}>
                    <AntDesign name="minus" size={24} color={workerCount <= MIN_WORKERS ? theme.colors.borderColor : theme.colors.iconColor} />
                </Pressable>
                <TextInput
                    style={styles.workerCountInput}
                    keyboardType="numeric"
                    value={String(workerCount)}
                    onChangeText={(text) => {
                      const num = parseInt(text);
                      if (!isNaN(num) && num >= MIN_WORKERS && num <= MAX_WORKERS) {
                        handleWorkerCountChange(num);
                      } else if (text === '') {
                        handleWorkerCountChange(MIN_WORKERS); // Default to MIN_WORKERS if input is cleared
                      }
                    }}
                    onBlur={() => {
                      // Ensure a valid number is set on blur if text input is invalid
                      if (isNaN(workerCount) || workerCount < MIN_WORKERS || workerCount > MAX_WORKERS) {
                        handleWorkerCountChange(MIN_WORKERS);
                      }
                    }}
                />
                <Pressable onPress={incrementWorkerCount} style={styles.workerCountButton} disabled={workerCount >= MAX_WORKERS}>
                    <AntDesign name="plus" size={24} color={workerCount >= MAX_WORKERS ? theme.colors.borderColor : theme.colors.iconColor} />
                </Pressable>
            </View>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Monthly Total:</Text>
            <Text style={styles.totalPrice}>{calculatedPrice} EUR</Text>
          </View>

          <Button
            onPress={handleContinue}
            disabled={isSubmitting}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          >
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Proceed to Payment</Text>}
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
  errorContainer: {
    backgroundColor: theme.colors.danger, // Use danger color from theme
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  errorText: {
    color: 'white', // White text on danger background
    fontWeight: 'bold',
    textAlign: 'center',
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
  workerCountControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.md,
    height: 50,
  },
  workerCountButton: {
    paddingHorizontal: theme.spacing(2),
    height: '100%',
    justifyContent: 'center',
  },
  workerCountInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: theme.colors.headingText,
    height: '100%',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.borderColor,
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
