import React, { useState } from 'react';
import { View, StyleSheet, Image, Dimensions, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Themed';
import { Link, useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import Logo from '../../../assets/koordlogoblack1.svg';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 900;

export default function LandingPage() {
  const router = useRouter();

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Link href="/(guest)" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <Image source={Logo} style={styles.logo} resizeMode="contain" />
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

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle} fontType="bold">
                Effortless Workforce Management for Modern Businesses
              </Text>
              <Text style={styles.heroSubtitle} fontType="regular">
                Streamline time tracking, project assignments, and reporting with Koord. Built for efficiency, designed for growth.
              </Text>
              <View style={styles.heroButtons}>
                <Button
                  title="Get Started"
                  onPress={() => router.push('/auth/signup')}
                  style={styles.heroButton}
                />
                <Text style={styles.heroFinePrint} fontType="regular">
                  No credit card required. Cancel anytime.
                </Text>
              </View>
            </View>
            
            <View style={styles.heroImageContainer}>
              <Card style={styles.imageCard}>
                <Image
                  source={require('../../../assets/appscreenshot.png')}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              </Card>
            </View>
          </View>

          {/* Features Grid */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle} fontType="bold">Built for the way you work</Text>
            <View style={styles.featuresGrid}>
              {[
                { icon: 'time-outline', title: 'Precise Time Tracking', desc: 'Capture every minute accurately across projects and tasks.' },
                { icon: 'calendar-outline', title: 'Intuitive Assignments', desc: 'Easily assign, track, and manage all your team\'s projects.' },
                { icon: 'stats-chart-outline', title: 'Comprehensive Reporting', desc: 'Generate detailed insights to optimize productivity and costs.' },
                { icon: 'phone-portrait-outline', title: 'Mobile-First Experience', desc: 'Manage your workforce on the go, from any device.' }
              ].map((feature, index) => (
                <Card key={index} style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name={feature.icon as any} size={32} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.featureTitle} fontType="bold">{feature.title}</Text>
                  <Text style={styles.featureDescription} fontType="regular">{feature.desc}</Text>
                </Card>
              ))}
            </View>
          </View>

          {/* Call to Action */}
          <View style={styles.ctaSection}>
            <Card style={styles.ctaCard}>
              <Text style={styles.ctaTitle} fontType="bold">Ready to transform your workflow?</Text>
              <Text style={styles.ctaSubtitle} fontType="regular">
                Join hundreds of businesses that use Koord to manage their workforce more effectively.
              </Text>
              <Button
                title="Get Started for Free"
                onPress={() => router.push('/auth/signup')}
                style={styles.ctaButton}
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
  logo: {
    width: 100,
    height: 30,
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
    flexDirection: isLargeScreen ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(8),
    paddingVertical: theme.spacing(12),
    gap: isLargeScreen ? theme.spacing(12) : theme.spacing(8),
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
  heroContent: {
    flex: isLargeScreen ? 1.2 : undefined,
    alignItems: isLargeScreen ? 'flex-start' : 'center',
  },
  heroTitle: {
    fontSize: isLargeScreen ? 56 : 36,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(3),
    lineHeight: isLargeScreen ? 68 : 44,
    textAlign: isLargeScreen ? 'left' : 'center',
  },
  heroSubtitle: {
    fontSize: isLargeScreen ? 20 : 18,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(6),
    lineHeight: 30,
    textAlign: isLargeScreen ? 'left' : 'center',
    maxWidth: 600,
  },
  heroButtons: {
    alignItems: isLargeScreen ? 'flex-start' : 'center',
  },
  heroButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(6),
    height: 56,
    borderRadius: theme.radius.lg,
    justifyContent: 'center',
  },
  heroFinePrint: {
    fontSize: 14,
    color: theme.colors.disabledText,
    marginTop: theme.spacing(2),
  },
  heroImageContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  imageCard: {
    padding: theme.spacing(1),
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.cardBackground,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
      }
    })
  },
  heroImage: {
    width: isLargeScreen ? 500 : width * 0.8,
    height: isLargeScreen ? 400 : 250,
    borderRadius: theme.radius.lg,
  },
  featuresSection: {
    paddingHorizontal: theme.spacing(8),
    paddingVertical: theme.spacing(12),
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
  sectionTitle: {
    fontSize: 32,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(8),
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing(4),
  },
  featureItem: {
    width: isLargeScreen ? '23%' : '100%',
    minWidth: 250,
    padding: theme.spacing(4),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
  },
  featureTitle: {
    fontSize: 18,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  featureDescription: {
    fontSize: 15,
    color: theme.colors.bodyText,
    lineHeight: 24,
  },
  ctaSection: {
    paddingHorizontal: theme.spacing(8),
    paddingVertical: theme.spacing(12),
    alignItems: 'center',
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
  ctaCard: {
    width: '100%',
    maxWidth: 800,
    padding: theme.spacing(8),
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: isLargeScreen ? 42 : 32,
    color: 'white',
    marginBottom: theme.spacing(2),
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing(6),
    textAlign: 'center',
    maxWidth: 500,
  },
  ctaButton: {
    backgroundColor: 'white',
    paddingHorizontal: theme.spacing(8),
    height: 56,
    borderRadius: theme.radius.lg,
    justifyContent: 'center',
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
