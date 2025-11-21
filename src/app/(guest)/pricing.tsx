import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Dimensions, Image } from 'react-native';
import { useRouter, Link } from 'expo-router'; // Import Link for "Sign In"
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import Logo from '../../../assets/logowhitenavy.png'; // Import the logo

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768; // Define what constitutes a large screen for responsive design

export default function PricingExplanationPage() {
  const router = useRouter();

  return (
    <AnimatedScreen>
      <View style={styles.outerContainer}>
        {isLargeScreen && (
          <View style={styles.marketingContainer}>
            <Image source={Logo} style={styles.marketingLogo} resizeMode="contain" />
            <Text style={styles.marketingTitle}>Flexible Pricing to Fit Your Needs</Text>
            <Text style={styles.marketingDescription}>
              WorkHoursTracker offers transparent, scalable pricing designed to grow with your team. Get started today with no hidden fees and full access to our powerful features.
            </Text>
            <Text style={styles.marketingBullet}>✅ Simple Pay-Per-Worker Model</Text>
            <Text style={styles.marketingBullet}>✅ No Hidden Fees</Text>
            <Text style={styles.marketingBullet}>✅ Automatic Scaling</Text>
            <Text style={styles.marketingDescription}>
              Join businesses worldwide optimizing their workforce management with WorkHoursTracker.
            </Text>
          </View>
        )}
        {!isLargeScreen && (
            <Image source={Logo} style={styles.smallScreenLogo} resizeMode="contain" />
        )}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>Simple & Transparent Pricing</Text>
            <Text style={styles.description}>
              WorkHoursTracker is designed to grow with your business. Our flexible plans ensure you only pay for what you need, with clear, predictable costs.
            </Text>

            <View style={styles.pricingCardsContainer}>
              <View style={styles.pricingCard}>
                <Text style={styles.pricingCardTitle}>Starter</Text>
                <Text style={styles.pricingCardPrice}>Free</Text>
                <Text style={styles.pricingCardPeriod}>for 1 user</Text>
                <Text style={styles.pricingCardFeature}>✅ Basic Time Tracking</Text>
                <Text style={styles.pricingCardFeature}>✅ Project Management</Text>
                <Button
                  title="Get Started Free"
                  onPress={() => router.push('/(guest)/register')}
                  style={styles.pricingCardButton}
                  textStyle={styles.pricingCardButtonText}
                />
              </View>

              <View style={styles.pricingCard}>
                <Text style={styles.pricingCardTitle}>Pro</Text>
                <Text style={styles.pricingCardPrice}>$5</Text>
                <Text style={styles.pricingCardPeriod}>per user/month</Text>
                <Text style={styles.pricingCardFeature}>✅ All Starter Features</Text>
                <Text style={styles.pricingCardFeature}>✅ Advanced Reporting</Text>
                <Text style={styles.pricingCardFeature}>✅ Unlimited Projects</Text>
                <Button
                  title="Choose Pro"
                  onPress={() => router.push('/(guest)/register')}
                  style={styles.pricingCardButton}
                  textStyle={styles.pricingCardButtonText}
                />
              </View>

              <View style={styles.pricingCard}>
                <Text style={styles.pricingCardTitle}>Enterprise</Text>
                <Text style={styles.pricingCardPrice}>Custom</Text>
                <Text style={styles.pricingCardPeriod}>for large teams</Text>
                <Text style={styles.pricingCardFeature}>✅ All Pro Features</Text>
                <Text style={styles.pricingCardFeature}>✅ Dedicated Support</Text>
                <Text style={styles.pricingCardFeature}>✅ Custom Integrations</Text>
                <Button
                  title="Contact Sales"
                  onPress={() => router.push('/(guest)/register')} // Or a contact form
                  style={styles.pricingCardButton}
                  textStyle={styles.pricingCardButtonText}
                />
              </View>
            </View>
            
            <View style={styles.signInLinkContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <Link href="/(guest)/login" style={styles.signInLink}>
                Sign In
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
    maxWidth: isLargeScreen ? 1200 : 500, // Adjusted to match register page
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
  // Pricing Card Styles
  pricingCardsContainer: {
    flexDirection: isLargeScreen ? 'row' : 'column', // Stack vertically on small screens
    gap: theme.spacing(4),
    marginBottom: theme.spacing(4),
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  pricingCard: {
    padding: theme.spacing(4),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    width: isLargeScreen ? '30%' : '100%',
    minWidth: 280,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      native: {
        elevation: 4,
      },
    }),
  },
  pricingCardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  pricingCardPrice: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing(0.5),
  },
  pricingCardPeriod: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(3),
  },
  pricingCardFeature: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(1),
  },
  pricingCardButton: {
    backgroundColor: theme.colors.primary, // Primary color for CTA
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(3),
    height: 50,
    justifyContent: 'center',
    width: '100%',
  },
  pricingCardButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Sign In Link (copied from register.tsx)
  signInLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing(3),
  },
  signInText: {
    fontSize: 14,
    color: theme.colors.bodyText,
  },
  signInLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
