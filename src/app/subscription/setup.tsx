import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, Image, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from '../../components/Themed';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../context/AuthContext';
import { setStorageItemAsync } from '../../hooks/useStorageState';
import { supabase } from '../../utils/supabase';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Logo } from '~/components/Logo';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 900;

// Define pricing constants from pricing page
const BASE_MONTHLY_FEE = 10; // EUR
const PRICE_PER_WORKER = 6; // EUR

export default function SubscriptionSetupPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, userCompanyId, isCompanyIdLoading, signOut } = useSession();
  const localSearchParams = useLocalSearchParams();
  const localCompanyId = localSearchParams.companyId as string | undefined;

  const currentCompanyId = localCompanyId || userCompanyId;
  
  const [numWorkers, setNumWorkers] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimatedCost = BASE_MONTHLY_FEE + (parseInt(numWorkers || '0') * PRICE_PER_WORKER);

  const handleDecrementWorkers = () => {
    setNumWorkers(prev => {
      const current = parseInt(prev || '0');
      return Math.max(1, current - 1).toString();
    });
  };

  const handleIncrementWorkers = () => {
    setNumWorkers(prev => (parseInt(prev || '0') + 1).toString());
  };

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      // Call the cleanup Edge Function to delete the user and company
      const { error: cleanupError } = await supabase.functions.invoke('cleanup-user-on-cancel');
      if (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    } catch (err) {
      console.error('Unexpected error during cleanup:', err);
    } finally {
      await setStorageItemAsync('pendingSubscription', null);
      signOut();
      setIsSubmitting(false);
    }
  };

  const handleContinue = async () => {
    setError(null);
    setIsSubmitting(true);
    console.log("Analytics: Pricing selection proceeded to payment.");

    try {
      if (!user) {
        Alert.alert(t('errors.authRequired'), t('errors.authRequiredMessage'));
        router.push('/auth/signup');
        return;
      }
      const userId = user.id;

      if (!userId) {
        Alert.alert(t('errors.authError'), t('errors.userIdMissing'));
        router.push('/auth/signup');
        return;
      }

      if (isCompanyIdLoading || !currentCompanyId) {
        Alert.alert(t('errors.companyError'), t('errors.companyIdMissing'));
        setIsSubmitting(false);
        return;
      }

      await setStorageItemAsync('pendingSubscription', JSON.stringify({ workerCount: parseInt(numWorkers), calculatedPrice: estimatedCost }));

      const { data, error: funcError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          userId,
          workerCount: parseInt(numWorkers),
          currency: 'EUR',
          billingCycle: 'monthly',
          intendedRole: 'owner',
          companyId: currentCompanyId,
        },
      });

      if (funcError) {
        throw funcError;
      }

      const { checkoutUrl } = data;
      if (checkoutUrl) {
        if (Platform.OS === 'web') {
          window.location.assign(checkoutUrl);
        } else {
          Alert.alert(t('common.redirectToStripe'), `${t('common.paymentUrl')}: ${checkoutUrl}`);
          console.log("Stripe Checkout URL:", checkoutUrl);
        }
      } else {
        setError(t('errors.paymentInitiationFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('errors.unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompanyIdLoading && !localCompanyId) {
    return (
      <View style={styles.fullscreenLoading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('loading.companyInfo')}</Text>
      </View>
    );
  }

  if (!currentCompanyId) {
    return (
        <View style={styles.fullscreenLoading}>
          <Text style={styles.loadingText}>{t('errors.companyNotFound')}</Text>
        </View>
    )
  }

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        {/* Header with Logo in top left */}
        <View style={styles.header}>
          <Logo style={styles.logo} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.mainContent}>
            <Text style={styles.title} fontType="bold">{t('subscriptionSetup.title', 'Confirm Your Plan')}</Text>
            <Text style={styles.description} fontType="regular">
              {t('subscriptionSetup.description', 'Review your subscription details before proceeding to payment.')}
            </Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText} fontType="regular">{error}</Text>
              </View>
            )}

            <Card style={styles.pricingCard}>
              <Text style={styles.pricingCardTitle} fontType="bold">{t('pricing.singlePlanTitle')}</Text>
              
              <View style={styles.feeContainer}>
                <Text style={styles.pricingCardBaseFee} fontType="bold">{BASE_MONTHLY_FEE} {t('common.currency')}</Text>
                <Text style={styles.perMonth} fontType="regular">/ {t('common.month')}</Text>
              </View>
              
              <Text style={styles.pricingCardPerWorker} fontType="regular">
                + {PRICE_PER_WORKER} {t('common.currency')} / {t('pricing.workerPerMonth')}
              </Text>
              
              <View style={styles.divider} />

              <Text style={styles.calculatorLabel} fontType="medium">{t('pricing.howManyWorkers')}</Text>
              <View style={styles.workerInputGroup}>
                <TouchableOpacity onPress={handleDecrementWorkers} style={styles.workerButton}>
                  <Text style={styles.workerButtonText} fontType="bold">−</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.calculatorInput}
                  keyboardType="numeric"
                  value={numWorkers}
                  onChangeText={(text) => setNumWorkers(text.replace(/[^0-9]/g, ''))}
                  placeholder="e.g., 10"
                  placeholderTextColor={theme.colors.disabledText}
                />
                <TouchableOpacity onPress={handleIncrementWorkers} style={styles.workerButton}>
                  <Text style={styles.workerButtonText} fontType="bold">+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.costBreakdown}>
                <Text style={styles.estimatedCostLabel} fontType="regular">{t('pricing.estimatedMonthlyCost')}</Text>
                <Text style={styles.estimatedCostValue} fontType="bold">{estimatedCost} {t('common.currency')}</Text>
              </View>

              <Button
                onPress={handleContinue}
                disabled={isSubmitting}
                style={styles.ctaButton}
              >
                 {isSubmitting ? (
                   <ActivityIndicator color="#fff" />
                 ) : (
                   <Text style={styles.ctaButtonText} fontType="regular">{t('subscriptionSetup.proceedToPayment', 'Proceed to Payment')}</Text>
                 )}
              </Button>

              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText} fontType="regular">{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
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
    paddingBottom: theme.spacing(10),
  },
  mainContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  title: {
    fontSize: isLargeScreen ? 36 : 28,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  description: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(5),
    maxWidth: 400,
  },
  pricingCard: {
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
  pricingCardTitle: {
    fontSize: 20,
    color: theme.colors.primary,
    marginBottom: theme.spacing(3),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing(0.5),
  },
  pricingCardBaseFee: {
    fontSize: 48,
    color: theme.colors.headingText,
  },
  perMonth: {
    fontSize: 18,
    color: theme.colors.bodyText,
    marginLeft: 4,
  },
  pricingCardPerWorker: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(4),
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: theme.colors.borderColor,
    marginBottom: theme.spacing(4),
  },
  calculatorLabel: {
    fontSize: 14,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  workerInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: theme.spacing(4),
    justifyContent: 'center',
  },
  workerButton: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerButtonText: {
    color: theme.colors.headingText,
    fontSize: 20,
  },
  calculatorInput: {
    flex: 1,
    maxWidth: 100,
    height: 48,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing(2),
    fontSize: 18,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.background,
  },
  costBreakdown: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    padding: theme.spacing(2.5),
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing(4),
  },
  estimatedCostLabel: {
    fontSize: 14,
    color: theme.colors.bodyText,
  },
  estimatedCostValue: {
    fontSize: 24,
    color: theme.colors.primary,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    width: '100%',
    height: 52,
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 16,
  },
  cancelButton: {
    marginTop: theme.spacing(2.5),
    padding: theme.spacing(1),
  },
  cancelButtonText: {
    color: theme.colors.disabledText,
    fontSize: 14,
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
  fullscreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginTop: theme.spacing(2),
  },
  errorContainer: {
    backgroundColor: theme.colors.errorBackground,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.errorText,
    width: '100%',
    maxWidth: 450,
  },
  errorText: {
    color: theme.colors.errorText,
    textAlign: 'center',
    fontSize: 14,
  },
});
