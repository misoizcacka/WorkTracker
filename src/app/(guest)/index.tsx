import React, { useState } from 'react';
import { View, StyleSheet, Image, Dimensions, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Themed';
import { Link, useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Logo } from '~/components/Logo';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 900;

interface FeatureItemProps {
  title: string;
  description: string;
  asset: any;
  isVideo?: boolean;
  reverse?: boolean;
  initialRatio?: number;
}

const FeatureItem = ({ title, description, asset, isVideo, reverse, initialRatio = 1.77 }: FeatureItemProps) => {
  const [aspectRatio, setAspectRatio] = useState(initialRatio);

  const textContent = (
    <View style={styles.featureTextContent}>
      <Text style={styles.featureTitle} fontType="bold">{title}</Text>
      <Text style={styles.featureDescription} fontType="regular">{description}</Text>
    </View>
  );

  const visualContent = (
    <View style={styles.featureVisualContainer}>
      <View style={[styles.visualWrapper, { aspectRatio }]}>
        {isVideo ? (
          <Video
            source={asset}
            style={styles.fill}
            videoStyle={{ width: '100%', height: '100%' }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            isMuted
            onReadyForDisplay={(e: any) => {
              if (e?.naturalSize?.height > 0) {
                setAspectRatio(e.naturalSize.width / e.naturalSize.height);
              }
            }}
          />
        ) : (
          <Image
            source={asset}
            style={styles.fill}
            resizeMode="contain"
            onLoad={(e: any) => {
              const source = e?.nativeEvent?.source || e?.nativeEvent;
              if (source?.width && source?.height) {
                setAspectRatio(source.width / source.height);
              }
            }}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(224, 224, 224, 0.1)', theme.colors.pageBackground]}
          style={styles.visualGradient}
          locations={[0, 0.9, 1]}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.featureRow, reverse && isLargeScreen && styles.featureRowReverse]}>
      {textContent}
      {visualContent}
    </View>
  );
};

export default function LandingPage() {
  const router = useRouter();

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
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroSubtitle} fontType="medium">MODERN FIELD MANAGEMENT</Text>
            <Text style={styles.heroTitle} fontType="bold">
              The Operating System for Your Field Workforce
            </Text>
            <Text style={styles.heroDescription} fontType="regular">
              Koord bridges the gap between the office and the field. Real-time location tracking, 
              automated assignments, and intelligent reporting in one seamless platform.
            </Text>
            <View style={styles.heroButtons}>
              <Button
                title="Get Started Now"
                onPress={() => router.push('/auth/signup')}
                style={styles.heroButton}
              />
              <TouchableOpacity style={styles.demoButton} onPress={() => {}}>
                <Text style={styles.demoButtonText} fontType="medium">Schedule Demo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Feature Showcase */}
          <View style={styles.featuresList}>
            <FeatureItem 
              title="Real-Time Map Overview"
              description="Monitor your entire field operation from a single, high-fidelity map. Track worker movement, project sites, and live status updates as they happen."
              asset={require('../../../assets/landing/mapoverview.mp4')}
              isVideo
            />

            <FeatureItem 
              title="Automated Assignments"
              description="Eliminate the guesswork in scheduling. Assign workers to project sites with precision and ensure your team is always where they need to be."
              asset={require('../../../assets/landing/assignments.mp4')}
              isVideo
              reverse
            />

            <FeatureItem 
              title="Location History Replay"
              description="Verify site visits and optimize routes with comprehensive location history. Replay any worker's path to ensure operational transparency and safety."
              asset={require('../../../assets/landing/locationreplay.png')}
            />

            <FeatureItem 
              title="Integrated Team Communication"
              description="Connect your managers and workers with context-aware chat. Resolve issues instantly with real-time messaging built directly into the platform."
              asset={require('../../../assets/landing/workermanagerchat.mp4')}
              isVideo
              reverse
              initialRatio={0.56}
            />

            <FeatureItem 
              title="Intelligent Reporting"
              description="Transform operational data into actionable insights. Generate detailed payroll and project costing reports with one click."
              asset={require('../../../assets/landing/report.png')}
              initialRatio={1.4}
            />
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber} fontType="bold">10k+</Text>
              <Text style={styles.statLabel}>Workers Managed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber} fontType="bold">99.9%</Text>
              <Text style={styles.statLabel}>System Uptime</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber} fontType="bold">24/7</Text>
              <Text style={styles.statLabel}>Live Visibility</Text>
            </View>
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <Card style={styles.ctaCard}>
              <Text style={styles.ctaTitle} fontType="bold">Ready to modernize your field operations?</Text>
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
    zIndex: 100,
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
  heroSection: {
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(16),
    paddingBottom: theme.spacing(12),
    alignItems: 'center',
    maxWidth: 1000,
    alignSelf: 'center',
  },
  heroSubtitle: {
    color: theme.colors.primary,
    letterSpacing: 2,
    fontSize: 14,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: isLargeScreen ? 64 : 42,
    color: theme.colors.headingText,
    textAlign: 'center',
    lineHeight: isLargeScreen ? 74 : 50,
    marginBottom: 28,
    letterSpacing: -1.5,
  },
  heroDescription: {
    fontSize: 20,
    color: theme.colors.bodyText,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 44,
    opacity: 0.8,
    maxWidth: 800,
  },
  heroButtons: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    gap: 20,
    alignItems: 'center',
  },
  heroButton: {
    height: 60,
    paddingHorizontal: 40,
    borderRadius: theme.radius.lg,
    minWidth: 220,
  },
  demoButton: {
    height: 60,
    paddingHorizontal: 40,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.borderColor,
    justifyContent: 'center',
    minWidth: 220,
  },
  demoButtonText: {
    color: theme.colors.headingText,
    fontSize: 18,
  },
  featuresList: {
    paddingHorizontal: theme.spacing(4),
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  featureRow: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(12),
    gap: theme.spacing(8),
  },
  featureRowReverse: {
    flexDirection: 'row-reverse',
  },
  featureTextContent: {
    flex: 1,
    maxWidth: isLargeScreen ? 480 : '100%',
  },
  featureVisualContainer: {
    flex: 1.2,
    width: '100%',
    alignItems: 'center',
  },
  visualWrapper: {
    width: '100%',
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.05,
        shadowRadius: 30,
      }
    })
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  visualGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '15%',
    zIndex: 1,
  },
  featureTitle: {
    fontSize: isLargeScreen ? 36 : 28,
    color: theme.colors.headingText,
    marginBottom: 20,
    lineHeight: isLargeScreen ? 44 : 34,
  },
  featureDescription: {
    fontSize: 18,
    color: theme.colors.bodyText,
    lineHeight: 28,
    opacity: 0.8,
  },
  statsBar: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: isLargeScreen ? 60 : 32,
    paddingVertical: theme.spacing(12),
    alignSelf: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderColor,
    width: '100%',
    backgroundColor: theme.colors.cardBackground,
    marginVertical: theme.spacing(8),
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 36,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.bodyText,
    opacity: 0.6,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.borderColor,
    display: isLargeScreen ? 'flex' : 'none',
  },
  ctaSection: {
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(12),
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  ctaCard: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing(10),
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    gap: 40,
  },
  ctaTitle: {
    fontSize: isLargeScreen ? 42 : 30,
    color: 'white',
    textAlign: 'center',
    lineHeight: isLargeScreen ? 52 : 38,
  },
  ctaButton: {
    backgroundColor: 'white',
    height: 60,
    paddingHorizontal: 56,
    borderRadius: theme.radius.lg,
  },
  ctaButtonText: {
    color: theme.colors.primary,
    fontSize: 18,
  },
  footer: {
    paddingVertical: 60,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.disabledText,
  },
});
