import React, { useState } from 'react';
import { View, StyleSheet, Image, Dimensions, Platform, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { Text } from '../../components/Themed';
import { Link, useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768; // Define what constitutes a large screen for responsive design

export default function LandingPage() {
  const router = useRouter();
  const scale = useSharedValue(1);

  const handleHoverIn = () => {
    if (Platform.OS === 'web') {
      scale.value = withSpring(1.05);
    }
  };

  const handleHoverOut = () => {
    if (Platform.OS === 'web') {
      scale.value = withSpring(1);
    }
  };

  const handlePressIn = () => {
    if (Platform.OS !== 'web') {
      scale.value = withSpring(1.05);
    }
  };

  const handlePressOut = () => {
    if (Platform.OS !== 'web') {
      scale.value = withSpring(1);
    }
  };

  const animatedStyle = {
    transform: [{ scale: scale }],
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header - Stripe-like clean header */}
        <View style={styles.header}>
          <Link href="/(guest)" asChild>
            <Image
              source={require('../../../assets/logokoordblack.png')} // Changed logo
              style={styles.logo}
              resizeMode="contain"
            />
          </Link>
          <View style={styles.navLinks}>
            {/* Optionally add more navigation links here */}
            <Link href="/(guest)/pricing" asChild>
              <Text style={styles.navLinkText} fontType="medium">Pricing</Text>
            </Link>
            <Link href="/(guest)/login" asChild>
              <Button title="Sign In" style={styles.signInButton} textStyle={styles.signInButtonText} />
            </Link>
          </View>
        </View>

        {/* Hero Section - Prominent, clean, value proposition */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle} fontType="bold">
              Effortless Workforce Management for Modern Businesses
            </Text>
            <Text style={styles.heroSubtitle} fontType="regular">
              Streamline time tracking, project assignments, and reporting with Koord. Built for efficiency, designed for growth.
            </Text>
            <Button
              title="Get Started"
              onPress={() => router.push('/auth/signup')}
              style={styles.heroButton}
              textStyle={styles.heroButtonText}
            />
            <Text style={styles.heroFinePrint} fontType="regular">
              No credit card required. Cancel anytime.
            </Text>
          </View>
          {/* Placeholder for a high-quality illustration or product mockup */}
          <TouchableWithoutFeedback
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            // @ts-ignore // Web-specific props
            onMouseEnter={handleHoverIn}
            onMouseLeave={handleHoverOut}
          >
            <Animated.Image
              source={require('../../../assets/appscreenshot.png')} // Replace with a more abstract, elegant graphic or screenshot
              style={[styles.heroImage, animatedStyle]}
              resizeMode="contain"
            />
          </TouchableWithoutFeedback>
        </View>

        {/* Features Grid - Clean, icon-driven, concise descriptions */}
        <View style={styles.featuresGridSection}>
          <Text style={styles.sectionTitle} fontType="bold">Built for the way you work</Text>
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              {/* Placeholder for Icon */}
              <Text style={styles.featureIcon} fontType="regular">⏱️</Text>
              <Text style={styles.featureTitle} fontType="bold">Precise Time Tracking</Text>
              <Text style={styles.featureDescription} fontType="regular">Capture every minute accurately across projects and tasks.</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon} fontType="regular">✅</Text>
              <Text style={styles.featureTitle} fontType="bold">Intuitive Project Assignment</Text>
              <Text style={styles.featureDescription} fontType="regular">Easily assign, track, and manage all your team's projects.</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon} fontType="regular">📊</Text>
              <Text style={styles.featureTitle} fontType="bold">Comprehensive Reporting</Text>
              <Text style={styles.featureDescription} fontType="regular">Generate detailed insights to optimize productivity and costs.</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon} fontType="regular">📱</Text>
              <Text style={styles.featureTitle} fontType="bold">Mobile-First Experience</Text>
              <Text style={styles.featureDescription} fontType="regular">Manage your workforce on the go, from any device.</Text>
            </View>
          </View>
        </View>

        {/* Call to Action - Repetitive but reinforcing */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle} fontType="bold">Ready to transform your workflow?</Text>
          <Button
            title="Get Started"
            onPress={() => router.push('/auth/signup')}
            style={styles.ctaButton}
            textStyle={styles.ctaButtonText}
          />
        </View>

        {/* Footer - Simple and informative */}
        <View style={styles.footer}>
          <Text style={styles.footerText} fontType="regular">© {new Date().getFullYear()} Koord. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Use a clean background color
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.colors.cardBackground, // Light background for header
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
    width: 100, // Updated size
    height: 30, // Updated size
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  navLinkText: {
    fontSize: 16,
    color: theme.colors.bodyText,

    ...Platform.select({
      web: {
        ':hover': {
          color: theme.colors.primary,
        },
      },
    }),
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

  // Hero Section
  heroSection: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(8),
    backgroundColor: theme.colors.background,
    gap: isLargeScreen ? theme.spacing(8) : theme.spacing(4),
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
  heroContent: {
    flex: isLargeScreen ? 1 : undefined,
    alignItems: isLargeScreen ? 'flex-start' : 'center',
    textAlign: isLargeScreen ? 'left' : 'center',
  },
  heroTitle: {
    fontSize: isLargeScreen ? 56 : 40,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(3),
    lineHeight: isLargeScreen ? 64 : 48,
  },
  heroSubtitle: {
    fontSize: isLargeScreen ? 20 : 18,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(4),
    lineHeight: isLargeScreen ? 30 : 26,
  },
  heroButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(5),
    paddingVertical: theme.spacing(2.5),
    borderRadius: theme.radius.lg,
    alignSelf: isLargeScreen ? 'flex-start' : 'center',
  },
  heroButtonText: {
    color: 'white',
    fontSize: 18,
  },  
  heroFinePrint: {
    fontSize: 14,
    color: theme.colors.bodyText,
    marginTop: theme.spacing(2),
    textAlign: isLargeScreen ? 'left' : 'center',
  },
  heroImage: {
    width: isLargeScreen ? '50%' : '80%',
    height: isLargeScreen ? 400 : 250,
    marginTop: isLargeScreen ? 0 : theme.spacing(4),
    borderRadius: theme.radius.xl, // Subtle rounded corners for modern look
    resizeMode: 'cover',
  },

  // Features Grid Section
  featuresGridSection: {
    padding: theme.spacing(8),
    backgroundColor: theme.colors.cardBackground,
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
            sectionTitle: {
              fontSize: isLargeScreen ? 40 : 32,
              color: theme.colors.headingText,
              textAlign: 'center',
              marginBottom: theme.spacing(6),
            },  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing(5),
  },
  featureItem: {
    width: isLargeScreen ? '45%' : '90%',
    maxWidth: 500,
    padding: theme.spacing(4),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  featureIcon: {
    fontSize: 48, // Larger icons
    marginBottom: theme.spacing(2),
  },
            featureTitle: {
              fontSize: 24,
              color: theme.colors.headingText,
              marginBottom: theme.spacing(1),
            },  featureDescription: {
    fontSize: 16,
    color: theme.colors.bodyText,
    lineHeight: 24,
  },

  // Call to Action Section (similar to hero button)
  ctaSection: {
    padding: theme.spacing(8),
    alignItems: 'center',
    backgroundColor: theme.colors.background, // Match hero or use a subtle accent
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
            ctaTitle: {
              fontSize: isLargeScreen ? 48 : 32,
              color: theme.colors.headingText,
              marginBottom: theme.spacing(4),
              textAlign: 'center',
              lineHeight: isLargeScreen ? 56 : 40,
            },  ctaButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(6),
    paddingVertical: theme.spacing(2.5),
    borderRadius: theme.radius.lg,
  },
            ctaButtonText: {
              color: 'white',
              fontSize: 18,
            },
  // Footer
  footer: {
    padding: theme.spacing(5),
    backgroundColor: theme.colors.cardBackground, // Consistent with header/features
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