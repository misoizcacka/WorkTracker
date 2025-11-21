import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform, Dimensions, Image } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import Logo from '../../../assets/logowhitenavy.png'; // Make sure this path is correct

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768; // Define what constitutes a large screen

export default function Signup() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});

  const handleSignup = () => {
    const newErrors: { fullName?: string; email?: string; password?: string } = {};
    if (!fullName) newErrors.fullName = 'Full name is required.';
    if (!email) {
      newErrors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email address is invalid.';
    }
    if (!password) newErrors.password = 'Password is required.';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters long.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    // Simulate API call for manager registration
    setTimeout(() => {
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify({ fullName, email, password }));

      setIsSubmitting(false);
      // Navigate to subscription setup page
      router.push('/subscription/setup');
    }, 1500);
  };

  return (
    <AnimatedScreen>
      <View style={styles.outerContainer}>
        {isLargeScreen && (
          <View style={styles.marketingContainer}>
            <Image source={Logo} style={styles.marketingLogo} resizeMode="contain" />
            <Text style={styles.marketingTitle}>Track Smarter, Work Happier.</Text>
            <Text style={styles.marketingDescription}>
              WorkHoursTracker simplifies time management for teams of all sizes. Gain clear insights into projects, optimize workforce allocation, and streamline payroll with ease.
            </Text>
            <Text style={styles.marketingBullet}>✅ Effortless Time Tracking</Text>
            <Text style={styles.marketingBullet}>✅ Seamless Project Assignments</Text>
            <Text style={styles.marketingBullet}>✅ Accurate Payroll Preparation</Text>
            <Text style={styles.marketingBullet}>✅ Boost Productivity & Efficiency</Text>
            <Text style={styles.marketingDescription}>
              Join thousands of businesses who trust WorkHoursTracker for precise time data and robust workforce analytics. Focus on what matters most, we'll handle the rest.
            </Text>
          </View>
        )}
        {!isLargeScreen && (
            <Image source={Logo} style={styles.smallScreenLogo} resizeMode="contain" />
        )}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.description}>
              Register your manager account to get started with WorkHoursTracker.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Your Full Name *"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholderTextColor="#999"
            />
            {errors.fullName && <View style={styles.errorContainer}><Text style={styles.errorText}>{errors.fullName}</Text></View>}
            <TextInput
              style={styles.input}
              placeholder="Email Address *"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
            {errors.email && <View style={styles.errorContainer}><Text style={styles.errorText}>{errors.email}</Text></View>}
            <TextInput
              style={styles.input}
              placeholder="Password *"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#999"
            />
            {errors.password && <View style={styles.errorContainer}><Text style={styles.errorText}>{errors.password}</Text></View>}
            
            <Button
              onPress={handleSignup}
              disabled={isSubmitting}
              style={styles.primaryButton}
              textStyle={styles.primaryButtonText}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
            </Button>

            {/* Placeholder for Google Sign-up */}
            <Button
              title="Sign up with Google"
              onPress={() => Alert.alert('Google Sign-up', 'Google sign-up coming soon!')}
              style={styles.googleButton}
              textStyle={styles.googleButtonText}
            />

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
    paddingTop: theme.spacing(8), // Add padding for the logo at the top
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
    zIndex: 10, // Ensure it's above other content
  },
  marketingTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: theme.spacing(4),
    lineHeight: 48,
    fontFamily: theme.font.bold,
  },
  marketingDescription: {
    fontSize: 18,
    color: 'white',
    marginBottom: theme.spacing(4),
    lineHeight: 28,
    fontFamily: theme.font.regular,
  },
  marketingBullet: {
    fontSize: 16,
    color: 'white',
    marginBottom: theme.spacing(1),
    fontWeight: 'bold',
    fontFamily: theme.font.medium,
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
    maxWidth: 500,
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
      }
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
    fontFamily: theme.font.bold,
  },
  description: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
    fontFamily: theme.font.regular,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  errorText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: theme.font.medium,
  },
  input: {
    height: 50,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.headingText,
    backgroundColor: 'white',
    fontFamily: theme.font.regular,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
    height: 50,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: theme.font.bold,
  },
  googleButton: {
    backgroundColor: '#DB4437',
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(1),
    height: 50,
    justifyContent: 'center',
  },
  googleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: theme.font.bold,
  },
  signInLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing(3),
  },
  signInText: {
    fontSize: 14,
    color: theme.colors.bodyText,
    fontFamily: theme.font.regular,
  },
  signInLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontFamily: theme.font.bold,
  },
});