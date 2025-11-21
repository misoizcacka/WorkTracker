import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';


interface PricingPlan {
  id: string;
  name: string;
  price: string;
  features: string[];
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: '$9.99/month',
    features: ['Up to 5 Workers', 'Basic Time Tracking', 'Standard Reports'],
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    price: '$29.99/month',
    features: ['Up to 20 Workers', 'Advanced Time Tracking', 'Custom Reports', 'Project Management'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price: '$99.99/month',
    features: ['Unlimited Workers', 'All Features', 'Dedicated Support', 'Custom Integrations'],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { managerEmail, companyName, managerName, numberOfWorkers } = params;

  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  const handleChoosePlan = () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a pricing plan.');
      return;
    }
    router.push({
      pathname: '/(guest)/payment',
      params: {
        managerEmail: managerEmail as string,
        companyName: companyName as string,
        managerName: managerName as string,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        planPrice: selectedPlan.price,
        numberOfWorkers: numberOfWorkers as string,
      },
    });
  };

  return (
    <AnimatedScreen>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.description}>
            Select the perfect plan for your business needs.
          </Text>

          <View style={styles.plansContainer}>
            {PRICING_PLANS.map((plan) => (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan?.id === plan.id && styles.selectedPlanCard,
                ]}
              >
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <View style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <Text key={index} style={styles.featureItem}>
                      • {feature}
                    </Text>
                  ))}
                </View>
                <Button
                  title={selectedPlan?.id === plan.id ? 'Selected' : 'Choose Plan'}
                  onPress={() => setSelectedPlan(plan)}
                  style={
                    selectedPlan?.id === plan.id
                      ? styles.chosenPlanButton
                      : styles.choosePlanButton
                  }
                  textStyle={
                    selectedPlan?.id === plan.id
                      ? styles.chosenPlanButtonText
                      : styles.choosePlanButtonText
                  }
                  disabled={selectedPlan?.id === plan.id}
                />
              </View>
            ))}
          </View>

          <Button
            onPress={handleChoosePlan}
            disabled={!selectedPlan}
            style={styles.continueButton}
            textStyle={styles.continueButtonText}
          >
            <Text style={styles.continueButtonText}>Continue to Payment</Text>
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
    padding: theme.spacing(2),
  },
  content: {
    justifyContent: 'center',
    padding: theme.spacing(4),
    backgroundColor: 'white',
    marginHorizontal: 'auto',
    maxWidth: 900,
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
  plansContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing(4), // Add gap for spacing between cards
    marginBottom: theme.spacing(4),
  },
  planCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: theme.radius.lg,
    padding: theme.spacing(3),
    width: Platform.OS === 'web' ? '30%' : '80%', // Adjust width for responsiveness
    maxWidth: 300,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minHeight: 300, // Ensure cards have similar height
    justifyContent: 'space-between',
  },
  selectedPlanCard: {
    borderColor: theme.colors.primary,
    backgroundColor: '#e6f0ff', // Light primary background
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing(2),
  },
  featuresList: {
    alignSelf: 'flex-start',
    marginBottom: theme.spacing(3),
  },
  featureItem: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(0.5),
  },
  choosePlanButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(1.5),
    marginTop: 'auto', // Push button to bottom
  },
  chosenPlanButton: {
    backgroundColor: theme.colors.primary,
  },
  choosePlanButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  chosenPlanButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    height: 50,
    justifyContent: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});