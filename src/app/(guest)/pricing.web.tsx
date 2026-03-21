import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, Image, TextInput, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Themed';
import { useRouter, Link } from 'expo-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Logo } from '~/components/Logo';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 900;

const BASE_MONTHLY_FEE = 10;
const PRICE_PER_WORKER = 6;

export default function PricingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [numWorkers, setNumWorkers] = useState('1');

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
    <AnimatedScreen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Link href="/(guest)" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <Logo style={styles.logo} />
            </TouchableOpacity>
          </Link>
          <View style={styles.navLinks}>
            <Link href="/(guest)/pricing" asChild>
              <TouchableOpacity>
                <Text style={styles.navLinkText} fontType="medium">{t('common.pricing')}</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/(guest)/login" asChild>
              <TouchableOpacity style={styles.signInButton}>
                <Text style={styles.signInButtonText} fontType="medium">{t('common.signIn')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pricingSection}>
            <Text style={styles.title} fontType="bold">{t('pricing.simpleTransparentPricingTitle')}</Text>
            <Text style={styles.description} fontType="regular">
              {t('pricing.simpleTransparentPricingDescription')}
            </Text>

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
                title={t('pricing.getStarted')}
                onPress={() => router.push('/auth/signup')}
                style={styles.ctaButton}
              />
            </Card>
            
            <View style={styles.faqSection}>
              <Text style={styles.faqHeading} fontType="bold">{t('pricing.faqHeading')}</Text>
              <View style={styles.faqGrid}>
                {[
                  { q: 'pricing.faq1Q', a: 'pricing.faq1A', params: { baseFee: BASE_MONTHLY_FEE, perWorkerFee: PRICE_PER_WORKER } },
                  { q: 'pricing.faq2Q', a: 'pricing.faq2A' },
                  { q: 'pricing.faq3Q', a: 'pricing.faq3A' },
                  { q: 'pricing.faq4Q', a: 'pricing.faq4A' },
                  { q: 'pricing.faq5Q', a: 'pricing.faq5A' },
                  { q: 'pricing.faq6Q', a: 'pricing.faq6A' }
                ].map((item, index) => (
                  <FAQItem
                    key={index}
                    question={t(item.q)}
                    answer={t(item.a, item.params)}
                  />
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText} fontType="regular">© {new Date().getFullYear()} Koord. {t('common.allRightsReserved')}</Text>
        </View>
      </View>
    </AnimatedScreen>
  );
}

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card style={styles.faqItem}>
      <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.faqQuestionButton} activeOpacity={0.7}>
        <Text style={styles.faqQuestionText} fontType="medium">{question}</Text>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.primary} />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswerText} fontType="regular">{answer}</Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    zIndex: 10,
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
  logo: {
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(4),
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
    fontSize: 15,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing(10),
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
    fontSize: 18,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(8),
    maxWidth: 600,
    lineHeight: 28,
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
    marginBottom: theme.spacing(10),
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
  faqSection: {
    width: '100%',
    maxWidth: 900,
    alignItems: 'center',
  },
  faqHeading: {
    fontSize: 32,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(6),
  },
  faqGrid: {
    width: '100%',
    gap: theme.spacing(2),
  },
  faqItem: {
    width: '100%',
    padding: 0,
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
  },
  faqQuestionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(3),
  },
  faqQuestionText: {
    fontSize: 17,
    color: theme.colors.headingText,
    flexShrink: 1,
  },
  faqAnswerContainer: {
    paddingHorizontal: theme.spacing(3),
    paddingBottom: theme.spacing(3),
    paddingTop: theme.spacing(1),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  faqAnswerText: {
    fontSize: 15,
    color: theme.colors.bodyText,
    lineHeight: 24,
  },
  footer: {
    padding: theme.spacing(5),
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.disabledText,
  },
});
