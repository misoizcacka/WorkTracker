import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Dimensions, Image, TextInput, TouchableOpacity } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import Logo from '../../../assets/logokoordwhite.png'; // Import the logo
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768; // Define what constitutes a large screen for responsive design

const BASE_MONTHLY_FEE = 19; // EUR - Updated
const PRICE_PER_WORKER = 5; // EUR - Updated

export default function Pricing() {
  const { t } = useTranslation();
  const router = useRouter();
  const [numWorkers, setNumWorkers] = useState('1'); // Default to 1 worker

  const estimatedCost = BASE_MONTHLY_FEE + (parseInt(numWorkers || '0') * PRICE_PER_WORKER);

  const handleStartFreeTrial = () => {
    router.push('/(guest)/register');
  };

  const handleDecrementWorkers = () => {
    setNumWorkers(prev => {
      const current = parseInt(prev || '0');
      return Math.max(1, current - 1).toString();
    });
  };

  const handleIncrementWorkers = () => {
    setNumWorkers(prev => (parseInt(prev || '0') + 1).toString());
  };

  return (
    <AnimatedScreen>
      <View style={styles.outerContainer}>
        {isLargeScreen && (
          <View style={styles.marketingContainer}>
            <Image source={Logo} style={styles.marketingLogo} resizeMode="contain" />
            <Text style={styles.marketingTitle}>{t('pricing.marketingTitle')}</Text>
            <Text style={styles.marketingDescription}>{t('pricing.marketingDescription1')}</Text>
            <Text style={styles.marketingBullet}>✅ {t('pricing.marketingBullet1')}</Text>
            <Text style={styles.marketingBullet}>✅ {t('pricing.marketingBullet2')}</Text>
            <Text style={styles.marketingBullet}>✅ {t('pricing.marketingBullet3')}</Text>
            <Text style={styles.marketingDescription}>{t('pricing.marketingDescription2')}</Text>
          </View>
        )}
        {!isLargeScreen && (
            <Image source={Logo} style={styles.smallScreenLogo} resizeMode="contain" />
        )}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* 1. Hero Section */}
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>{t('pricing.heroTitle')}</Text>
              <Text style={styles.heroSubtitle}>{t('pricing.heroSubtitle')}</Text>
              <Button
                title={t('pricing.startFreeTrial')}
                onPress={handleStartFreeTrial}
                style={styles.heroButton}
                textStyle={styles.heroButtonText}
              />
              {/* Visual element placeholder */}
              <View style={styles.heroImagePlaceholder}>
                <Image source={require('../../../assets/appscreenshot.png')} style={styles.heroImage} resizeMode="contain" />
              </View>
            </View>

            {/* 2. Pricing Breakdown Card */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>{t('pricing.pricingBreakdownHeading')}</Text>
              <View style={styles.pricingCard}>
                <Text style={styles.pricingCardTitle}>{t('pricing.standardPlanTitle')}</Text>
                <Text style={styles.pricingCardBaseFee}>{BASE_MONTHLY_FEE} € / {t('pricing.month')}</Text>
                <Text style={styles.pricingCardPerWorker}>+ {PRICE_PER_WORKER} € / {t('pricing.workerPerMonth')}</Text>
                <Text style={styles.pricingCardExplanation}>{t('pricing.proratingExplanation')}</Text>

                <View style={styles.calculatorContainer}>
                  <Text style={styles.calculatorLabel}>{t('pricing.howManyWorkers')}</Text>
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
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity onPress={handleIncrementWorkers} style={styles.workerButton}>
                      <Text style={styles.workerButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.estimatedCostText}>{t('pricing.estimatedMonthlyCost')}: <Text style={styles.estimatedCostValue}>{estimatedCost} €</Text></Text>
                </View>

                <Button
                  title={t('pricing.startFreeTrial')}
                  onPress={handleStartFreeTrial}
                  style={styles.primaryButton}
                  textStyle={styles.primaryButtonText}
                />
              </View>
            </View>

            {/* 3. Why This Price Is Worth It */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>{t('pricing.whyWorthItHeading')}</Text>
              <View style={styles.featureGrid}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🗓️</Text>
                  <Text style={styles.featureText}>{t('pricing.feature1')}</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>📍</Text>
                  <Text style={styles.featureText}>{t('pricing.feature2')}</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>📱</Text>
                  <Text style={styles.featureText}>{t('pricing.feature3')}</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>💬</Text>
                  <Text style={styles.featureText}>{t('pricing.feature4')}</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>⏰</Text>
                  <Text style={styles.featureText}>{t('pricing.feature5')}</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🗺️</Text>
                  <Text style={styles.featureText}>{t('pricing.feature6')}</Text>
                </View>
              </View>
            </View>
            
            {/* 6. FAQ Section */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>{t('pricing.faqHeading')}</Text>
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{t('pricing.faq1Q')}</Text>
                <Text style={styles.faqAnswer}>{t('pricing.faq1A')}</Text>
              </View>
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{t('pricing.faq2Q')}</Text>
                <Text style={styles.faqAnswer}>{t('pricing.faq2A')}</Text>
              </View>
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{t('pricing.faq3Q')}</Text>
                <Text style={styles.faqAnswer}>{t('pricing.faq3A')}</Text>
              </View>
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{t('pricing.faq4Q')}</Text>
                <Text style={styles.faqAnswer}>{t('pricing.faq4A')}</Text>
              </View>
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{t('pricing.faq5Q')}</Text>
                <Text style={styles.faqAnswer}>{t('pricing.faq5A')}</Text>
              </View>
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{t('pricing.faq6Q')}</Text>
                <Text style={styles.faqAnswer}>{t('pricing.faq6A')}</Text>
              </View>
            </View>

            {/* 7. Bottom CTA */}
            <View style={[styles.section, styles.bottomCtaSection]}>
              <Text style={styles.bottomCtaHeading}>{t('pricing.bottomCtaHeading')}</Text>
              <Button
                title={t('pricing.startFreeTrial')}
                onPress={handleStartFreeTrial}
                style={styles.heroButton}
                textStyle={styles.heroButtonText}
              />
              <Link href="/contact" asChild>
                <TouchableOpacity>
                  <Text style={styles.talkToUsLink}>{t('pricing.talkToUs')}</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </View>
        </ScrollView>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    flexDirection: isLargeScreen ? 'row' : 'column',
  },
  marketingContainer: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    padding: theme.spacing(8),
    paddingTop: theme.spacing(8),
  },
  marketingLogo: {
    position: 'absolute',
    top: theme.spacing(4),
    left: theme.spacing(4),
    width: 100,
    height: 30,
    resizeMode: 'contain',
  },
  smallScreenLogo: {
    position: 'absolute',
    top: theme.spacing(4),
    left: theme.spacing(4),
    width: 100,
    height: 30,
    resizeMode: 'contain',
    zIndex: 10,
  },
  marketingTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: theme.spacing(4),
    lineHeight: 48,
  },
  marketingDescription: {
    fontSize: 18,
    color: 'white',
    marginBottom: theme.spacing(4),
    lineHeight: 28,
  },
  marketingBullet: {
    fontSize: 16,
    color: 'white',
    marginBottom: theme.spacing(1),
    fontWeight: 'bold',
  },
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
    maxWidth: 800, // Adjusted for wider content on pricing page
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
  section: {
    marginBottom: theme.spacing(6),
    alignItems: 'center',
  },
  sectionHeading: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  sectionDescription: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
    maxWidth: 600,
  },
  // Hero Section Styles
  heroSection: {
    alignItems: 'center',
    marginBottom: theme.spacing(8),
    padding: theme.spacing(4),
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(2),
    lineHeight: 56,
  },
  heroSubtitle: {
    fontSize: 20,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
    maxWidth: 700,
  },
  heroButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(4),
    minWidth: 200,
  },
  heroButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  heroImagePlaceholder: {
    marginTop: theme.spacing(6),
    width: '100%',
    height: 300,
    backgroundColor: theme.colors.borderColor, // Placeholder background
    borderRadius: theme.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  // Pricing Breakdown Card
  pricingCard: {
    padding: theme.spacing(5),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
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
    maxWidth: 450,
    width: '100%',
    marginVertical: theme.spacing(4),
  },
  pricingCardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing(2),
  },
  pricingCardBaseFee: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  pricingCardPerWorker: {
    fontSize: 18,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(3),
  },
  pricingCardExplanation: {
    fontSize: 14,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
    lineHeight: 20,
  },
  calculatorContainer: {
    width: '100%',
    padding: theme.spacing(3),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(4),
    alignItems: 'center',
  },
  workerInputGroup: { // New style for the input group
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%', // Make it less wide
    marginBottom: theme.spacing(2),
    alignSelf: 'center', // Center the input group
    justifyContent: 'center', // Explicitly center content within the group
  },
  workerButton: { // New style for +/- buttons
    backgroundColor: 'white', // Changed to white
    borderColor: theme.colors.borderColor, // Subtle border
    borderWidth: 1, // Add border
    borderRadius: theme.radius.md,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    // Removed shadow for consistency with border, can add back if desired.
  },
  workerButtonText: { // New style for +/- button text
    color: theme.colors.headingText, // Changed to dark text color
    fontSize: 24,
    fontWeight: 'bold',
  },
  calculatorLabel: {
    fontSize: 16,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  calculatorInput: {
    flex: 1, // Take remaining space
    height: 45,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginHorizontal: theme.spacing(1), // Space between button and input
  },
  estimatedCostText: {
    fontSize: 18,
    color: theme.colors.headingText,
    fontWeight: '500',
  },
  estimatedCostValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },

  // Why This Price Is Worth It (Features)
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing(4),
    maxWidth: 800,
  },
  featureItem: {
    width: isLargeScreen ? '30%' : '45%', // 3 per row on large, 2 per row on small
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  featureIcon: {
    fontSize: 36,
    marginBottom: theme.spacing(1),
  },
  featureText: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    lineHeight: 22,
  },

  // FAQ Section
  faqItem: {
    width: '100%',
    maxWidth: 700,
    marginBottom: theme.spacing(3),
    padding: theme.spacing(3),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  faqQuestion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  faqAnswer: {
    fontSize: 16,
    color: theme.colors.bodyText,
    lineHeight: 24,
  },

  // Bottom CTA
  bottomCtaSection: {
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing(6),
    marginBottom: 0,
  },
  bottomCtaHeading: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
  },
  talkToUsLink: {
    marginTop: theme.spacing(3),
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(4),
    minWidth: 200,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});