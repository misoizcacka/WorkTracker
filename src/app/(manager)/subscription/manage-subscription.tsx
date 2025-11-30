import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { theme } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';

// ==========================================================
// MOCK DATA AND FUNCTIONS - REPLACE WITH ACTUAL IMPLEMENTATION
// ==========================================================
interface CurrentSubscription {
  workerSlots: number;
  baseFee: number;
  pricePerWorker: number;
}

const MOCK_CURRENT_SUBSCRIPTION: CurrentSubscription = {
  workerSlots: 10,
  baseFee: 19,
  pricePerWorker: 5,
};

const MOCK_CURRENT_WORKERS_COUNT = 7; // Assume 7 active workers

const mockUpdateSubscription = async (newSlotCount: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Updating subscription to ${newSlotCount} slots.`);
      // In a real app, you'd update your global state or call an API here.
      // For mock, we just resolve after a delay.
      resolve();
    }, 1500);
  });
};
// ==========================================================
// END MOCK DATA
// ==========================================================

// Reusable Stepper Component
interface StepperProps {
  value: number;
  onValueChange: (newValue: number) => void;
  min: number;
  max: number;
  step?: number;
}

const Stepper: React.FC<StepperProps> = ({ value, onValueChange, min, max, step = 1 }) => {
  const decrement = useCallback(() => {
    if (value > min) {
      onValueChange(value - step);
    }
  }, [value, min, step, onValueChange]);

  const increment = useCallback(() => {
    if (value < max) {
      onValueChange(value + step);
    }
  }, [value, max, step, onValueChange]);

  return (
    <View style={stepperStyles.container}>
      <TouchableOpacity onPress={decrement} style={stepperStyles.button} disabled={value <= min}>
        <Ionicons name="remove-outline" size={24} color={value <= min ? theme.colors.bodyText : theme.colors.primary} />
      </TouchableOpacity>
      <Text style={stepperStyles.valueText}>{value}</Text>
      <TouchableOpacity onPress={increment} style={stepperStyles.button} disabled={value >= max}>
        <Ionicons name="add-outline" size={24} color={value >= max ? theme.colors.bodyText : theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const stepperStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    paddingVertical: theme.spacing(1),
  },
  button: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
  },
  valueText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.headingText,
    minWidth: 40,
    textAlign: 'center',
  },
});

// Reusable PriceSummaryCard Component
interface PriceSummaryCardProps {
  baseFee: number;
  pricePerWorker: number;
  workerSlots: number;
  currencyCode?: string;
  locale?: string;
}

const PriceSummaryCard: React.FC<PriceSummaryCardProps> = ({
  baseFee,
  pricePerWorker,
  workerSlots,
  currencyCode = 'EUR',
  locale = 'de-DE', // Example locale for Euro formatting
}) => {
  const totalCost = baseFee + (workerSlots * pricePerWorker);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  }, [locale, currencyCode]);

  return (
    <Card style={styles.priceSummaryCard}>
      <Text style={styles.cardTitle}>Pricing Breakdown</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Base fee:</Text>
        <Text style={styles.priceValue}>{formatCurrency(baseFee)} / month</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Worker slots ({workerSlots} × {formatCurrency(pricePerWorker)}):</Text>
        <Text style={styles.priceValue}>{formatCurrency(workerSlots * pricePerWorker)} / month</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.priceRow}>
        <Text style={styles.totalPriceLabel}>Total:</Text>
        <Text style={styles.totalPriceValue}>{formatCurrency(totalCost)} / month</Text>
      </View>
    </Card>
  );
};


export default function ManageSubscriptionScreen() {
  const router = useRouter();

  const currentSubscription = MOCK_CURRENT_SUBSCRIPTION;
  const currentWorkersCount = MOCK_CURRENT_WORKERS_COUNT;

  const [newSlotCount, setNewSlotCount] = useState(currentSubscription.workerSlots);
  const [isSaving, setIsSaving] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Calculate minimum allowed slots based on active workers
  const minimumAllowedSlots = Math.max(currentWorkersCount, 0); // Ensure it's not negative

  useEffect(() => {
    // If newSlotCount falls below minimumAllowedSlots due to external changes, adjust it.
    // This could happen if currentWorkersCount changes after initial render.
    if (newSlotCount < minimumAllowedSlots) {
      setNewSlotCount(minimumAllowedSlots);
      setWarningMessage(`You cannot reduce worker slots below your active workers (${currentWorkersCount}).`);
    } else if (newSlotCount > currentSubscription.workerSlots) {
      setWarningMessage(null); // Clear warning if increasing
    }
  }, [newSlotCount, minimumAllowedSlots, currentSubscription.workerSlots, currentWorkersCount]);

  const handleSlotCountChange = useCallback((value: number) => {
    if (value < minimumAllowedSlots) {
      setNewSlotCount(minimumAllowedSlots); // Prevent going below min
      setWarningMessage(`You cannot reduce worker slots below your active workers (${currentWorkersCount}).`);
    } else {
      setNewSlotCount(value);
      setWarningMessage(null);
    }
  }, [minimumAllowedSlots, currentWorkersCount]);

  const hasChanges = newSlotCount !== currentSubscription.workerSlots;

  const handleSaveChanges = useCallback(async () => {
    if (!hasChanges || isSaving || newSlotCount < minimumAllowedSlots) {
      return;
    }

    setIsSaving(true);
    try {
      await mockUpdateSubscription(newSlotCount);
      console.log('Subscription updated successfully. Navigating back to account.');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update subscription. Please try again.');
      console.error('Subscription update error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, isSaving, newSlotCount, minimumAllowedSlots, router]);

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <Text style={styles.header}>Manage Subscription</Text>

        <Card style={styles.infoCard}>
          <Text style={styles.infoText}>
            You currently have <Text style={styles.highlightText}>{currentWorkersCount}</Text> active workers.
          </Text>
          <Text style={styles.infoText}>
            Your current plan includes <Text style={styles.highlightText}>{currentSubscription.workerSlots}</Text> worker slots.
          </Text>
        </Card>

        <Card style={styles.slotsCard}>
          <Text style={styles.cardTitle}>Number of Worker Slots</Text>
          <Stepper
            value={newSlotCount}
            onValueChange={handleSlotCountChange}
            min={0} // Stepper min can be 0, but handleSlotCountChange will enforce minimumAllowedSlots
            max={500}
          />
          {warningMessage && <Text style={styles.warningText}>{warningMessage}</Text>}
        </Card>

        <PriceSummaryCard
          baseFee={currentSubscription.baseFee}
          pricePerWorker={currentSubscription.pricePerWorker}
          workerSlots={newSlotCount}
        />

        <Button
          title={isSaving ? "Saving..." : "Save Changes"}
          onPress={handleSaveChanges}
          disabled={!hasChanges || isSaving || newSlotCount < minimumAllowedSlots}
          style={styles.saveButton}
        >
          {isSaving && <ActivityIndicator size="small" color="#fff" style={styles.activityIndicator} />}
          <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
        </Button>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing(3),
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(3),
    textAlign: 'center',
  },
  infoCard: {
    width: '100%',
    maxWidth: 600,
    marginBottom: theme.spacing(2),
  },
  infoText: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(0.5),
  },
  highlightText: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  slotsCard: {
    width: '100%',
    maxWidth: 600,
    marginBottom: theme.spacing(2),
    alignItems: 'center', // Center stepper within card
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
    textAlign: 'center',
  },
  warningText: {
    color: theme.colors.danger,
    marginTop: theme.spacing(1.5),
    textAlign: 'center',
    fontSize: 14,
  },
  priceSummaryCard: {
    width: '100%',
    maxWidth: 600,
    marginBottom: theme.spacing(3),
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderColor,
  },
  priceLabel: {
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.headingText,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
    marginVertical: theme.spacing(1),
  },
  totalPriceLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  totalPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  saveButton: {
    width: '100%',
    maxWidth: 600,
    paddingVertical: theme.spacing(2),
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  activityIndicator: {
    marginRight: theme.spacing(1),
  },
});
