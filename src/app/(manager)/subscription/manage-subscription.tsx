import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../components/Themed';
import { Button } from '../../../components/Button';
import { useSession } from '../../../context/AuthContext';
import { EmployeesContext, EmployeesContextType } from '../../../context/EmployeesContext';
import { supabase } from '../../../utils/supabase';
import moment from 'moment';

const BASE_MONTHLY_FEE = 10;
const PRICE_PER_WORKER = 6;

export default function ManageSubscriptionScreen() {
  const router = useRouter();
  const { user, userCompanyId, userCompanyName, userSubscriptionPeriodEnd } = useSession();
  const employeesContext = useContext(EmployeesContext) as EmployeesContextType;

  const currentSeats = employeesContext?.seatLimit || 0;
  const activeWorkers = employeesContext?.seatsUsed || 0;

  const [newSlotCount, setNewSlotCount] = useState(currentSeats);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (currentSeats > 0) {
      setNewSlotCount(currentSeats);
      setIsInitialLoading(false);
    }
  }, [currentSeats]);

  const handleIncrement = () => setNewSlotCount(prev => prev + 1);
  const handleDecrement = () => {
    if (newSlotCount > activeWorkers) {
      setNewSlotCount(prev => prev - 1);
    } else {
      Alert.alert("Limit Reached", `You cannot have fewer seats than your current active workers (${activeWorkers}).`);
    }
  };

  const hasChanges = newSlotCount !== currentSeats;
  const isIncrease = newSlotCount > currentSeats;

  // Calculate Proration Estimate Locally
  const prorationEstimate = useMemo(() => {
    if (!isIncrease || !userSubscriptionPeriodEnd) return 0;

    const end = moment(userSubscriptionPeriodEnd);
    const start = moment(userSubscriptionPeriodEnd).subtract(1, 'month');
    const now = moment();

    const totalDays = end.diff(start, 'days') || 30;
    const remainingDays = Math.max(0, end.diff(now, 'days'));
    
    // Safety check: if remaining days is 0 (last day), assume at least a small portion or 0
    const ratio = remainingDays / totalDays;
    const diff = (newSlotCount - currentSeats) * PRICE_PER_WORKER;
    
    return diff * ratio;
  }, [newSlotCount, currentSeats, isIncrease, userSubscriptionPeriodEnd]);

  const handleSaveChanges = async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('update-subscription-seats', {
        body: {
          companyId: userCompanyId,
          newWorkerCount: newSlotCount,
          userId: user?.id,
        }
      });

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      if (data?.checkoutUrl) {
        // Redirection for Increase
        if (Platform.OS === 'web') {
          window.location.href = data.checkoutUrl;
        } else {
          Linking.openURL(data.checkoutUrl);
        }
      } else if (data?.status === 'success') {
        // Confirmation for Decrease or Direct Update
        Alert.alert("Success", "Subscription updated successfully.");
        router.back();
      } else {
        throw new Error("Unexpected response from server.");
      }
    } catch (err: any) {
      console.error("Update Error:", err);
      Alert.alert("Update Failed", err.message || "Failed to update subscription.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isInitialLoading && currentSeats === 0) {
    return (
      <AnimatedScreen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </AnimatedScreen>
    );
  }

  const currentMonthly = BASE_MONTHLY_FEE + (currentSeats * PRICE_PER_WORKER);
  const newMonthly = BASE_MONTHLY_FEE + (newSlotCount * PRICE_PER_WORKER);

  return (
    <AnimatedScreen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.headingText} />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle} fontType="bold">Manage Subscription</Text>
            <Text style={styles.pageSubtitle}>{userCompanyName}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* 1. Status Overview */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle} fontType="bold">Plan Overview</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue} fontType="bold">{activeWorkers}</Text>
                <Text style={styles.statLabel}>Active Workers</Text>
              </View>
              <View style={[styles.statBox, styles.statDivider]}>
                <Text style={styles.statValue} fontType="bold">{currentSeats}</Text>
                <Text style={styles.statLabel}>Current Seats</Text>
              </View>
            </View>
            {userSubscriptionPeriodEnd && (
              <Text style={styles.periodNote}>
                Current billing period ends {moment(userSubscriptionPeriodEnd).format('MMMM D, YYYY')}
              </Text>
            )}
          </Card>

          {/* 2. Seat Adjuster */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle} fontType="bold">Adjust Capacity</Text>
            <Text style={styles.adjusterDescription}>
              Add or remove worker seats. Each seat allows one active worker to use the app.
            </Text>
            
            <View style={styles.stepperContainer}>
              <TouchableOpacity 
                style={[styles.stepperButton, newSlotCount <= activeWorkers && styles.stepperButtonDisabled]} 
                onPress={handleDecrement}
                disabled={newSlotCount <= activeWorkers}
              >
                <Ionicons name="remove" size={24} color={newSlotCount <= activeWorkers ? theme.colors.disabledText : "white"} />
              </TouchableOpacity>
              
              <View style={styles.stepperValueContainer}>
                <Text style={styles.stepperValue} fontType="bold">{newSlotCount}</Text>
                <Text style={styles.stepperLabel}>SEATS</Text>
              </View>

              <TouchableOpacity style={styles.stepperButton} onPress={handleIncrement}>
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {isIncrease && (
              <View style={styles.prorationNotice}>
                <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.prorationText}>
                    You will be charged a prorated amount for the remaining billing period today.
                  </Text>
                  {prorationEstimate > 0 && (
                    <Text style={styles.dueTodayText} fontType="bold">
                      Estimated Due Today: €{prorationEstimate.toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </Card>

          {/* 3. Pricing Summary */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle} fontType="bold">New Monthly Total</Text>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Base Platform Fee</Text>
              <Text style={styles.pricingValue}>€{BASE_MONTHLY_FEE.toFixed(2)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Worker Seats ({newSlotCount} × €{PRICE_PER_WORKER})</Text>
              <Text style={styles.pricingValue}>€{(newSlotCount * PRICE_PER_WORKER).toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel} fontType="bold">New Monthly Total</Text>
              <Text style={styles.totalValue} fontType="bold">€{newMonthly.toFixed(2)}</Text>
            </View>
            
            {hasChanges && (
              <View style={styles.diffContainer}>
                <Text style={styles.diffLabel}>Difference:</Text>
                <Text style={[styles.diffValue, { color: isIncrease ? theme.colors.success : theme.colors.primary }]} fontType="bold">
                  {isIncrease ? '+' : '-'}€{Math.abs(newMonthly - currentMonthly).toFixed(2)} / month
                </Text>
              </View>
            )}
          </Card>

          <Button 
            title={isIncrease ? "Proceed to Payment" : "Update Subscription"}
            onPress={handleSaveChanges}
            disabled={!hasChanges || isSaving}
            loading={isSaving}
            style={styles.primaryButton}
          />
          
          <Text style={styles.footerNote}>
            All prices include VAT where applicable. Proration is calculated automatically by Stripe.
          </Text>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: theme.spacing(4),
    ...Platform.select({
      web: {
        maxWidth: 800,
        alignSelf: 'center',
        paddingHorizontal: theme.spacing(4),
      },
    }),
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 400,
  },
  pageHeader: {
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: theme.spacing(2),
  },
  pageTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  pageSubtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.bodyText,
  },
  content: {
    paddingHorizontal: theme.spacing(2),
  },
  sectionCard: {
    marginBottom: theme.spacing(2),
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  sectionTitle: {
    fontSize: 16,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  statValue: {
    fontSize: 24,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.bodyText,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  periodNote: {
    fontSize: 12,
    color: theme.colors.disabledText,
    textAlign: 'center',
    marginTop: theme.spacing(2),
  },
  adjusterDescription: {
    fontSize: 14,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(3),
    lineHeight: 20,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(4),
    marginVertical: theme.spacing(2),
  },
  stepperButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepperButtonDisabled: {
    backgroundColor: theme.colors.primaryMuted,
    elevation: 0,
  },
  stepperValueContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  stepperValue: {
    fontSize: 48,
    color: theme.colors.headingText,
  },
  stepperLabel: {
    fontSize: 10,
    color: theme.colors.bodyText,
    letterSpacing: 2,
    marginTop: -4,
  },
  prorationNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primary + '10',
    padding: theme.spacing(2),
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(3),
    gap: theme.spacing(1.5),
  },
  prorationText: {
    fontSize: 12,
    color: theme.colors.bodyText,
    lineHeight: 18,
  },
  dueTodayText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 4,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1.5),
  },
  pricingLabel: {
    fontSize: 14,
    color: theme.colors.bodyText,
  },
  pricingValue: {
    fontSize: 14,
    color: theme.colors.headingText,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
    marginVertical: theme.spacing(2),
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    color: theme.colors.headingText,
  },
  totalValue: {
    fontSize: 22,
    color: theme.colors.primary,
  },
  diffContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing(1),
    gap: theme.spacing(1),
  },
  diffLabel: {
    fontSize: 12,
    color: theme.colors.disabledText,
  },
  diffValue: {
    fontSize: 12,
  },
  primaryButton: {
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing(2),
  },
  footerNote: {
    fontSize: 11,
    color: theme.colors.disabledText,
    textAlign: 'center',
    marginTop: theme.spacing(3),
    paddingHorizontal: theme.spacing(4),
    lineHeight: 16,
  },
});
