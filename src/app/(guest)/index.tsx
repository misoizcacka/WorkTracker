import React from 'react';
import { View, StyleSheet, Image, Dimensions, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Themed';
import { Link, useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Logo } from '~/components/Logo';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 900;
const isWeb = Platform.OS === 'web';

const constructionWorkersIllustration = isWeb ? require('../../../assets/landing/undraw_construction-workers_z99i.svg') : null;
const scrumBoardIllustration = isWeb ? require('../../../assets/landing/undraw_scrum-board_7bgh.svg') : null;
const destinationIllustration = isWeb ? require('../../../assets/landing/undraw_destination_fkst.svg') : null;
const timeManagementIllustration = isWeb ? require('../../../assets/landing/undraw_time-management_4ss6.svg') : null;
const fallbackImage = require('../../../assets/landing/locationreplay.png');

type BenefitCardProps = {
  title: string;
  description: string;
  asset: any;
};

function BenefitCard({ title, description, asset }: BenefitCardProps) {
  return (
    <Card style={styles.benefitCard}>
      <View style={styles.benefitArt}>
        {isWeb && asset ? (
          <Image source={asset} style={styles.benefitImage} resizeMode="contain" />
        ) : (
          <View style={styles.benefitFallback} />
        )}
      </View>
      <Text style={styles.benefitTitle} fontType="bold">{title}</Text>
      <Text style={styles.benefitDescription} fontType="regular">{description}</Text>
    </Card>
  );
}

export default function LandingPage() {
  const router = useRouter();

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Link href="/(guest)" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <Logo style={styles.logo} />
            </TouchableOpacity>
          </Link>
          <View style={styles.navLinks}>
            <Link href="/(guest)/pricing" asChild>
              <TouchableOpacity>
                <Text style={styles.navLinkText} fontType="medium">Pricing</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/(guest)/login" asChild>
              <TouchableOpacity style={styles.signInButton}>
                <Text style={styles.signInButtonText} fontType="medium">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <View style={styles.heroCopy}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText} fontType="bold">CONSTRUCTION CREW MANAGEMENT</Text>
              </View>
              <Text style={styles.heroTitle} fontType="bold">
                Assign jobs, track crews, and keep every project day organized.
              </Text>
              <Text style={styles.heroDescription} fontType="regular">
                Koord helps construction companies schedule workers, verify site activity,
                and track time in the field without spreadsheets, whiteboards, or constant phone calls.
              </Text>
              <View style={styles.heroButtons}>
                <Button
                  title="Start Free"
                  onPress={() => router.push('/auth/signup')}
                  style={styles.heroButton}
                />
                <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(guest)/pricing')}>
                  <Text style={styles.secondaryButtonText} fontType="medium">See Pricing</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.heroVisual}>
              <Card style={styles.heroVisualCard}>
                {isWeb && constructionWorkersIllustration ? (
                  <Image source={constructionWorkersIllustration} style={styles.heroIllustration} resizeMode="contain" />
                ) : (
                  <Image source={fallbackImage} style={styles.heroIllustration} resizeMode="contain" />
                )}
              </Card>
            </View>
          </View>

          <View style={styles.benefitsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow} fontType="bold">WHAT KOORD HELPS WITH</Text>
              <Text style={styles.sectionTitle} fontType="bold">
                Three things that matter on busy job days.
              </Text>
            </View>

            <View style={styles.benefitsGrid}>
              <BenefitCard
                title="Scheduling"
                description="Plan the day clearly and assign the right workers to the right jobs in the right order."
                asset={scrumBoardIllustration}
              />
              <BenefitCard
                title="Location Tracking"
                description="See when workers arrive on-site, leave, and move between project locations."
                asset={destinationIllustration}
              />
              <BenefitCard
                title="Time Visibility"
                description="Keep a cleaner record of time spent in the field for payroll and project review."
                asset={timeManagementIllustration}
              />
            </View>
          </View>

          <View style={styles.ctaSection}>
            <Card style={styles.ctaCard}>
              <Text style={styles.ctaTitle} fontType="bold">
                Built to make field operations simpler for managers and workers.
              </Text>
              <Button
                title="Create Your Account"
                onPress={() => router.push('/auth/signup')}
                style={styles.ctaButton}
                textStyle={styles.ctaButtonText}
              />
            </Card>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText} fontType="regular">© {new Date().getFullYear()} Koord. All rights reserved.</Text>
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
  logo: {},
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
  heroSection: {
    padding: theme.spacing(8),
    gap: theme.spacing(5),
    alignItems: 'center',
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
        flexDirection: isLargeScreen ? 'row' : 'column',
      },
    }),
  },
  heroCopy: {
    flex: 1,
    width: '100%',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.75),
    marginBottom: theme.spacing(2),
  },
  heroBadgeText: {
    color: theme.colors.primary,
    fontSize: 11,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: isLargeScreen ? 52 : 36,
    lineHeight: isLargeScreen ? 60 : 42,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
    maxWidth: 720,
  },
  heroDescription: {
    fontSize: 18,
    lineHeight: 28,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(3),
    maxWidth: 640,
  },
  heroButtons: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    gap: theme.spacing(2),
    alignItems: isLargeScreen ? 'center' : 'stretch',
  },
  heroButton: {
    height: 56,
    paddingHorizontal: 34,
    borderRadius: theme.radius.lg,
    minWidth: 190,
  },
  secondaryButton: {
    height: 56,
    paddingHorizontal: 28,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    minWidth: 170,
  },
  secondaryButtonText: {
    color: theme.colors.headingText,
    fontSize: 17,
  },
  heroVisual: {
    flex: 1,
    width: '100%',
  },
  heroVisualCard: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(3),
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: isLargeScreen ? 420 : 280,
  },
  heroIllustration: {
    width: '100%',
    height: isLargeScreen ? 340 : 220,
  },
  benefitsSection: {
    paddingHorizontal: theme.spacing(8),
    paddingBottom: theme.spacing(4),
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing(4),
  },
  sectionEyebrow: {
    fontSize: 12,
    letterSpacing: 1.1,
    color: theme.colors.primary,
    marginBottom: theme.spacing(1),
  },
  sectionTitle: {
    fontSize: isLargeScreen ? 34 : 28,
    color: theme.colors.headingText,
    textAlign: 'center',
  },
  benefitsGrid: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    gap: theme.spacing(2),
  },
  benefitCard: {
    flex: 1,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(3),
    alignItems: 'center',
    minHeight: 280,
  },
  benefitArt: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  benefitImage: {
    width: '100%',
    height: '100%',
  },
  benefitFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primaryMuted,
  },
  benefitTitle: {
    fontSize: 22,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
    textAlign: 'center',
  },
  benefitDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.bodyText,
    textAlign: 'center',
  },
  ctaSection: {
    padding: theme.spacing(8),
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1100,
        alignSelf: 'center',
      },
    }),
  },
  ctaCard: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(5),
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  ctaTitle: {
    fontSize: isLargeScreen ? 34 : 28,
    color: theme.colors.headingText,
    textAlign: 'center',
    maxWidth: 720,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    height: 56,
    paddingHorizontal: 36,
    borderRadius: theme.radius.lg,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 17,
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
