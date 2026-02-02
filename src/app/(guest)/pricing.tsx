import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, Image, TextInput, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Themed';
import { useRouter, Link } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next'; // Re-adding i18n

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

// Define pricing constants
const BASE_MONTHLY_FEE = 10; // EUR - User specified
const PRICE_PER_WORKER = 6; // EUR - User specified

export default function PricingPage() {
  const { t } = useTranslation(); // Re-adding useTranslation
  const router = useRouter();
  const [numWorkers, setNumWorkers] = useState('1'); // Default to 1 worker

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Link href="/(guest)" asChild>
            <Image
              source={require('../../../assets/logokoordblack.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Link>
          <View style={styles.navLinks}>
            <Link href="/(guest)/pricing" asChild>
              <Text style={styles.navLinkText} fontType="medium">{t('common.pricing')}</Text>
            </Link>
            <Link href="/(guest)/login" asChild>
              <Button title={t('common.signIn')} style={styles.signInButton} textStyle={styles.signInButtonText} />
            </Link>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          <Text style={styles.title} fontType="bold">{t('pricing.simpleTransparentPricingTitle')}</Text>
          <Text style={styles.description} fontType="regular">
            {t('pricing.simpleTransparentPricingDescription')}
          </Text>

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
                title={t('pricing.getStarted')}
                onPress={() => router.push('/(guest)/register')}
                style={styles.ctaButton}
                textStyle={styles.ctaButtonText}
              />
            </View>
          </View>
          
          {/* FAQ Section */}
          <View style={styles.faqSection}>
            <Text style={styles.faqHeading} fontType="bold">{t('pricing.faqHeading')}</Text>
            <FAQItem
              question={t('pricing.faq1Q')}
              answer={t('pricing.faq1A', { baseFee: BASE_MONTHLY_FEE, perWorkerFee: PRICE_PER_WORKER })}
            />
            <FAQItem
              question={t('pricing.faq2Q')}
              answer={t('pricing.faq2A')}
            />
            <FAQItem
              question={t('pricing.faq3Q')}
              answer={t('pricing.faq3A')}
            />
            <FAQItem
              question={t('pricing.faq4Q')}
              answer={t('pricing.faq4A')}
            />
            <FAQItem
              question={t('pricing.faq5Q')}
              answer={t('pricing.faq5A')}
            />
            <FAQItem
              question={t('pricing.faq6Q')}
              answer={t('pricing.faq6A')}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText} fontType="regular">© {new Date().getFullYear()} WorkHoursTracker. {t('common.allRightsReserved')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// FAQ Item Component
interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.faqQuestionButton}>
        <Text style={styles.faqQuestionText} fontType="medium">{question}</Text>
        <Text style={styles.faqExpandIcon}>{isExpanded ? '-' : '+'}</Text>
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswerText} fontType="regular">{answer}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Header (from index.tsx)
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
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  navLinkText: {
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  signInButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(1.5),
    borderRadius: theme.radius.md,
  },
  signInButtonText: {
    color: 'white',
  },

  // Pricing Section
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
  
  // Single Pricing Card Styles
  pricingCardContainer: {
    width: '100%',
    maxWidth: 500, // Limit width of single card
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
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
  },

  // FAQ Section
  faqSection: {
    width: '100%',
    maxWidth: 900,
    alignItems: 'center',
    paddingVertical: theme.spacing(6),
  },
  faqHeading: {
    fontSize: isLargeScreen ? 36 : 28,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(5),
  },
  faqItem: {
    width: '100%',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    marginBottom: theme.spacing(2),
    overflow: 'hidden', // Ensures content respects border radius
  },
  faqQuestionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.colors.cardBackground,
  },
  faqQuestionText: {
    fontSize: 18,
    color: theme.colors.headingText,
    flexShrink: 1, // Allows text to wrap
  },
  faqExpandIcon: {
    fontSize: 24,
    color: theme.colors.primary,
    marginLeft: theme.spacing(2),
  },
  faqAnswerContainer: {
    paddingHorizontal: theme.spacing(3),
    paddingBottom: theme.spacing(3),
    paddingTop: theme.spacing(1),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  faqAnswerText: {
    fontSize: 16,
    color: theme.colors.bodyText,
    lineHeight: 22,
  },

  // Footer (from index.tsx)
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
});
