import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function CheckoutMock() {
  const router = useRouter();
  const [workerCount, setWorkerCount] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const subscriptionDetails = localStorage.getItem('subscriptionDetails');
    if (subscriptionDetails) {
      const { workerCount, calculatedPrice } = JSON.parse(subscriptionDetails);
      setWorkerCount(workerCount);
      setMonthlyTotal(calculatedPrice);
    }
    setIsLoading(false);
  }, []);

  const handlePay = () => {
    setIsLoading(true);
    setTimeout(() => {
      localStorage.setItem('subscriptionActive', 'true');
      setIsLoading(false);
      router.push('/subscription/success');
    }, 2000); // Simulate payment processing time
  };

  if (isLoading) {
    return (
      <AnimatedScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Mock Stripe Checkout</Text>
          <Text style={styles.description}>Review your order before proceeding with the mock payment.</Text>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Workers:</Text>
              <Text style={styles.summaryValue}>{workerCount}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Monthly Price:</Text>
              <Text style={styles.summaryValue}>{monthlyTotal} EUR</Text>
            </View>
          </View>

          <View style={styles.cardDetailsMock}>
            <Text style={styles.cardDetailsText}>Test Card Details (Mock)</Text>
            <Text style={styles.cardDetailsText}>Card Number: **** **** **** 4242</Text>
            <Text style={styles.cardDetailsText}>Expires: 12/25</Text>
            <Text style={styles.cardDetailsText}>CVC: ***</Text>
          </View>

          <Button
            onPress={handlePay}
            disabled={isLoading}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Pay with test card (mock)</Text>}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.bodyText,
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
  summaryContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(4),
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  summaryLabel: {
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.headingText,
  },
  cardDetailsMock: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(4),
  },
  cardDetailsText: {
    fontSize: 14,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(1),
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
