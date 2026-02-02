import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform, Dimensions, Image, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { Button } from '../../components/Button';
import { Text } from '../../components/Themed'; // Import Themed Text
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import Logo from '../../../assets/logokoordblack.png';
import { supabase } from '../../utils/supabase';
import { useSession } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../../components/LanguageSelector';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function Login() {
  const { refreshUser, user, userRole } = useSession()!; // Get refreshUser and user/userRole
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      if (userRole === 'manager' || userRole === 'owner') {
        router.replace('/(manager)/dashboard');
      } else if (userRole === 'worker') {
        router.replace('/(worker)/home');
      }
    }
  }, [user, userRole, router]);

  const handleLogin = async () => {
    setErrors({});
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = t('login.errors.emailRequired');
    if (!password) newErrors.password = t('login.errors.passwordRequired');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrors({ general: t('login.errors.invalidCredentials') }); // Generic error for security
        console.error('Login error:', error.message);
      } else {
        await refreshUser(); // Refresh user state to get latest app_metadata
        // The _layout.tsx will handle redirection after successful login and refreshUser
      }
    } catch (error: any) {
      setErrors({ general: error.message });
      console.error('Unexpected login error:', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLogoHref = () => {
    if (!user) {
      return '/(guest)';
    }
    // Assuming user is logged in
    if (userRole === 'manager' || userRole === 'owner') {
      return '/(manager)/dashboard';
    } else if (userRole === 'worker') {
      return '/(worker)/home';
    }
    return '/(guest)'; // Default fallback
  };

  return (
    <AnimatedScreen>
      <View style={styles.outerContainer}>
        {isLargeScreen && (
          <View style={styles.marketingContainer}>
            <Link href={getLogoHref()} style={styles.marketingLogo} asChild>
              <Image source={Logo} resizeMode="contain" />
            </Link>
            <Text style={styles.marketingTitle} fontType="bold">{t('login.marketingTitle')}</Text>
            <Text style={styles.marketingDescription} fontType="regular">{t('login.marketingDescription')}</Text>
            <Text style={styles.marketingBullet} fontType="regular">✅ {t('login.marketingBullet1')}</Text>
            <Text style={styles.marketingBullet} fontType="regular">✅ {t('login.marketingBullet2')}</Text>
            <Text style={styles.marketingBullet} fontType="regular">✅ {t('login.marketingBullet3')}</Text>
            <Text style={styles.marketingBullet} fontType="regular">✅ {t('login.marketingBullet4')}</Text>
            <Text style={styles.marketingDescription} fontType="regular">{t('login.marketingDescription2')}</Text>
          </View>
        )}
        {isLargeScreen && <View style={styles.separatorVertical} />} {/* Vertical separator line */}
        {!isLargeScreen && (
            <Link href={getLogoHref()} style={styles.smallScreenLogo} asChild>
              <Image source={Logo} resizeMode="contain" />
            </Link>
        )}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title} fontType="bold">{t('login.loginHeading')}</Text>
            <Text style={styles.description} fontType="regular">{t('login.loginDescription')}</Text>

            {errors.general && <View style={styles.errorContainer}><Text style={styles.errorText} fontType="regular">{errors.general}</Text></View>}
            
            <TextInput
              style={styles.input}
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.colors.bodyText}
            />
            {errors.email && <View style={styles.errorContainer}><Text style={styles.errorText} fontType="regular">{errors.email}</Text></View>}

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                placeholderTextColor={theme.colors.bodyText}
              />
              <Pressable onPress={() => setPasswordVisible(!passwordVisible)} style={styles.passwordToggle}>
                <Feather
                  name={passwordVisible ? 'eye' : 'eye-off'}
                  size={20}
                  color={theme.colors.iconColor}
                />
              </Pressable>
            </View>
            {errors.password && <View style={styles.errorContainer}><Text style={styles.errorText} fontType="regular">{errors.password}</Text></View>}

            <Button
              onPress={handleLogin}
              disabled={isSubmitting}
              style={styles.primaryButton}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText} fontType="regular">{t('login.loginButton')}</Text>}
            </Button>

            <View style={styles.linkContainer}>
                <Link href="/(guest)/forgot-password" asChild>
                    <Text style={styles.forgotPasswordLink} fontType="regular">{t('login.forgotPassword')}</Text>
                </Link>
            </View>


            <View style={styles.separatorContainer}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText} fontType="regular">{t('login.or')}</Text>
              <View style={styles.separatorLine} />
            </View>

            <Button
              title={t('login.signUpButton')}
              onPress={() => router.push('/auth/signup')}
              style={styles.secondaryButton}
            />
          </View>
        </ScrollView>
      </View>
      <View style={styles.languageSelectorContainer}>
        <LanguageSelector />
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
    backgroundColor: theme.colors.background, // Changed to consistent background
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
  },
  smallScreenLogo: {
    position: 'absolute',
    top: theme.spacing(4),
    left: theme.spacing(4),
    width: 100,
    height: 30,
    zIndex: 10,
  },
  marketingTitle: {
    fontSize: 40,
    color: theme.colors.headingText, // Changed to dark text color
    marginBottom: theme.spacing(4),
    lineHeight: 48,
  },
  marketingDescription: {
    fontSize: 18,
    color: theme.colors.bodyText, // Changed to dark text color
    marginBottom: theme.spacing(4),
    lineHeight: 28,
  },
  marketingBullet: {
    fontSize: 16,
    color: theme.colors.bodyText, // Changed to dark text color
    marginBottom: theme.spacing(1),
  },
  separatorVertical: {
    width: 1,
    backgroundColor: theme.colors.borderColor,
    // Adjust height if needed, flex: 1 should make it fill parent height
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing(2),
  },
  container: { // Renamed from content to container for the main login form wrapper
    flex: 1,
    backgroundColor: theme.colors.background, // Consistent background
  },
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
  content: { // This is the actual login form content
    justifyContent: 'center',
    padding: theme.spacing(4),
    backgroundColor: theme.colors.cardBackground, // Consistent with card backgrounds
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
  errorContainer: {
    backgroundColor: theme.colors.errorBackground, // Use theme color
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  errorText: {
    color: theme.colors.errorText, // Use theme color
    textAlign: 'center',
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
    backgroundColor: theme.colors.background, // Use theme color for input background
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(2),
    backgroundColor: theme.colors.background, // Use theme color for input background
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.headingText,
    backgroundColor: theme.colors.background, // Use theme color for input background
  },
  passwordToggle: {
    padding: theme.spacing(2),
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
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary, // Assuming secondary is defined in theme
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(1),
    height: 50,
    justifyContent: 'center',
  },
  linkContainer: {
      alignItems: 'flex-end',
      marginBottom: theme.spacing(2),
  },
  forgotPasswordLink: {
      color: theme.colors.primary,
      fontSize: 14,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: theme.spacing(2),
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderColor,
  },
  separatorText: {
    marginHorizontal: theme.spacing(2),
    color: theme.colors.bodyText,
  },
  languageSelectorContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? theme.spacing(4) : theme.spacing(6), // Adjust for notch on native
    right: theme.spacing(4),
    zIndex: 100, // Ensure it's above other content
  },
});
