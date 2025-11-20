import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, SafeAreaView, Platform, ScrollView } from 'react-native';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';
import { PixelatedBackground } from '../../components/PixelatedBackground';
import { useRouter } from 'expo-router';

const BASE_MONTHLY_FEE = 10; // EUR
const PRICE_PER_WORKER = 5; // EUR

export default function Pricing() {
  const { t } = useTranslation();
  const router = useRouter();
  const [numWorkers, setNumWorkers] = useState('1'); // Default to 1 worker

  const monthlyCost = BASE_MONTHLY_FEE + (parseInt(numWorkers || '0') * PRICE_PER_WORKER);

  const handleConfirmPricing = () => {
    if (parseInt(numWorkers || '0') <= 0) {
      Alert.alert(t('pricing.error'), t('pricing.invalidWorkerCount'));
      return;
    }
    // In a real app, you would pass pricing details to the payment page
    router.push('/(guest)/payment.web');
  };

  return (
    <SafeAreaView style={styles.container}>
      <PixelatedBackground />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('pricing.title')}</Text>
          <Text style={styles.description}>{t('pricing.description')}</Text>

          <View style={styles.pricingDetails}>
            <Text style={styles.pricingText}>{t('pricing.baseFee', { fee: BASE_MONTHLY_FEE })}</Text>
            <Text style={styles.pricingText}>{t('pricing.perWorkerFee', { price: PRICE_PER_WORKER })}</Text>
          </View>

          <Text style={styles.inputLabel}>{t('pricing.numberOfWorkers')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 30"
            value={numWorkers}
            onChangeText={(text) => setNumWorkers(text.replace(/[^0-9]/g, ''))} // Only allow numbers
            keyboardType="numeric"
          />

          <Text style={styles.totalCostLabel}>{t('pricing.totalMonthlyCost')}</Text>
          <Text style={styles.totalCostValue}>{monthlyCost} EUR</Text>

          <Button
            title={t('pricing.confirmButton')}
            onPress={handleConfirmPricing}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
    padding: theme.spacing(4),
    backgroundColor: 'white',
    marginHorizontal: 'auto',
    maxWidth: 500,
    width: '100%',
    borderRadius: theme.radius.md,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
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
  pricingDetails: {
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.md,
  },
  pricingText: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(1),
  },
  inputLabel: {
    fontSize: 16,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  input: {
    height: 50,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(3),
    fontSize: 16,
    color: theme.colors.headingText,
  },
  totalCostLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  totalCostValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
