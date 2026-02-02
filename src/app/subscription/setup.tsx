import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, Image, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from '../../components/Themed';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../context/AuthContext';
import { setStorageItemAsync } from '../../hooks/useStorageState';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

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
    await setStorageItemAsync('pendingSubscription', null);
    signOut();
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
            <Image
              source={require('../../../assets/logokoordblack.png')}
              style={styles.logo}
              resizeMode="contain"
            />
        </View>

        <View style={styles.pricingSection}>
          <Text style={styles.title} fontType="bold">{t('subscriptionSetup.title', 'Confirm Your Plan')}</Text>
          <Text style={styles.description} fontType="regular">
            {t('subscriptionSetup.description', 'Review your subscription details before proceeding to payment.')}
          </Text>

          {error && <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View>}

          <View style={styles.pricingCardContainer}>
            <View style={styles.pricingCard}>
              <Text style={styles.pricingCardTitle} fontType="bold">{t('pricing.singlePlanTitle')}</Text>
              <Text style={styles.pricingCardBaseFee} fontType="bold">{BASE_MONTHLY_FEE} {t('common.currency')} / {t('common.month')}</Text>
              <Text style={styles.pricingCardPerWorker} fontType="regular">+ {PRICE_PER_WORKER} {t('common.currency')} / {t('pricing.workerPerMonth')}</Text>
              
              <Text style={styles.calculatorLabel} fontType="regular">{t('pricing.howManyWorkers')}</Text>
              <View style={styles.workerInputGroup}>
                <TouchableOpacity onPress={handleDecrementWorkers} style={styles.workerButton}>
                  <Text style={styles.workerButtonText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.calculatorInput}
                  keyboardType="numeric"
                  value={numWorkers}
                  onChangeText={(text) => setNumWorkers(text.replace(/[^0-9]/g, ''))}
                  placeholder="e.g., 10"
                  placeholderTextColor={theme.colors.bodyText}
                />
                <TouchableOpacity onPress={handleIncrementWorkers} style={styles.workerButton}>
                  <Text style={styles.workerButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.estimatedCostText} fontType="regular">{t('pricing.estimatedMonthlyCost')}: <Text style={styles.estimatedCostValue} fontType="bold">{estimatedCost} {t('common.currency')}</Text></Text>

              <Button
                onPress={handleContinue}
                disabled={isSubmitting}
                style={styles.ctaButton}
              >
                 {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaButtonText}>{t('subscriptionSetup.proceedToPayment', 'Proceed to Payment')}</Text>}
              </Button>
               <Button
                onPress={handleCancel}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
            </Button>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText} fontType="regular">© {new Date().getFullYear()} WorkHoursTracker. {t('common.allRightsReserved')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
  logo: {
    width: 100,
    height: 30,
  },
  pricingSection: {
    padding: theme.spacing(8),
    alignItems: 'center',
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
  title: {
    fontSize: isLargeScreen ? 48 : 32,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(2),
  },
  description: {
    fontSize: isLargeScreen ? 18 : 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(6),
    maxWidth: 600,
  },
  pricingCardContainer: {
    width: '100%',
    maxWidth: 500,
    marginBottom: theme.spacing(6),
  },
  pricingCard: {
    padding: theme.spacing(5),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    alignItems: 'center',
    textAlign: 'center',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      native: {
        elevation: 6,
      },
    }),
  },
  pricingCardTitle: {
    fontSize: 32,
    color: theme.colors.primary,
    marginBottom: theme.spacing(2),
  },
  pricingCardBaseFee: {
    fontSize: 48,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  pricingCardPerWorker: {
    fontSize: 20,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(4),
  },
  calculatorLabel: {
    fontSize: 18,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  workerInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginBottom: theme.spacing(3),
    justifyContent: 'center',
  },
  workerButton: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerButtonText: {
    color: theme.colors.headingText,
    fontSize: 24,
    fontWeight: 'bold',
  },
  calculatorInput: {
    flex: 1,
    height: 45,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    fontSize: 18,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginHorizontal: theme.spacing(2),
  },
  estimatedCostText: {
    fontSize: 20,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(4),
  },
  estimatedCostValue: {
    fontSize: 32,
    color: theme.colors.primary,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(5),
    paddingVertical: theme.spacing(2.5),
    borderRadius: theme.radius.lg,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    marginTop: theme.spacing(2),
    height: 50,
    justifyContent: 'center',
    borderRadius: theme.radius.md,
  },
  cancelButtonText: {
    color: theme.colors.bodyText,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing(5),
    backgroundColor: theme.colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    alignItems: 'center',
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.bodyText,
  },
  fullscreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 18,
    color: theme.colors.bodyText,
    marginTop: theme.spacing(2),
  },
  errorContainer: {
    backgroundColor: theme.colors.errorBackground,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  errorText: {
    color: theme.colors.errorText,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});