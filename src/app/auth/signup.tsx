import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform, Dimensions, Image, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { useSession } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Text } from '../../components/Themed';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import Logo from '../../../assets/logokoordblack.png'; // Corrected path
import { supabase } from '../../utils/supabase';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../../components/LanguageSelector';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function Signup() {
  const router = useRouter();
  const { refreshUser, user, userRole } = useSession();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string; general?: string }>({});

  const getLogoHref = () => {
    if (!user) {
      return '/(guest)';
    }
    if (userRole === 'manager' || userRole === 'owner') {
      return '/(manager)/dashboard';
    } else if (userRole === 'worker') {
      return '/(worker)/home';
    }
    return '/(guest)';
  };

  const handleSignup = async () => {
    console.log("Analytics: Signup initiated.");
    const newErrors: { fullName?: string; email?: string; password?: string; } = {};
    if (!fullName) newErrors.fullName = t('signup.errors.fullNameRequired');
    if (!email) {
      newErrors.email = t('signup.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('signup.errors.emailInvalid');
    }
    if (!password) {
      newErrors.password = t('signup.errors.passwordRequired');
    } else if (password.length < 6) {
      newErrors.password = t('signup.errors.passwordLength');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      console.log("Analytics: Signup validation failed.", newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    console.log("Analytics: Attempting Supabase signup.");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'owner',
          },
        },
      });

      if (error) {
        console.error("Analytics: Supabase signup failed.", error.message);
        setErrors({ general: error.message });
        return;
      }

      if (data.user) {
        console.log("Analytics: Supabase signup successful, user created. User ID:", data.user.id);

        const { data: edgeFunctionData, error: edgeFunctionError } = await supabase.functions.invoke('create-owner-and-company', {
          body: {
            userId: data.user.id,
            fullName: fullName,
            email: email,
            companyName: "New Company",
          }
        });

        if (edgeFunctionError) {
          console.error('Error invoking create-owner-and-company Edge Function:', edgeFunctionError);
          setErrors({ general: t('signup.failedToFinalizeSetup') });
          return;
        }
        
        const { company, employee } = edgeFunctionData;
        console.log('Company and owner employee created:', company, employee);

        await refreshUser();
        router.push({ pathname: '/subscription/setup', params: { companyId: company.id } });
      } else {
        console.log("Analytics: Supabase signup successful, but user object is null. Likely awaiting email confirmation.");
        setErrors({ general: t('signup.checkEmailConfirmation') }); // New i18n key needed
      }
    } catch (error: any) {
      console.error("Analytics: Supabase signup encountered an unexpected error.", error.message);
      setErrors({ general: error.message || t('signup.unexpectedError') });
    } finally {
      setIsSubmitting(false);
      console.log("Analytics: Signup request finished.");
    }
  };

  return (
    <AnimatedScreen>
      <View style={styles.outerContainer}>
        {isLargeScreen && (
          <View style={styles.marketingContainer}>
            <Link href={getLogoHref()} style={styles.marketingLogo} asChild>
              <Image source={Logo} resizeMode="contain" />
            </Link>
            <Text style={styles.marketingTitle} fontType="bold">{t('signup.marketingTitle')}</Text>
            <Text style={styles.marketingDescription} fontType="regular">{t('signup.marketingDescription')}</Text>
            <Text style={styles.marketingBullet} fontType="regular">✅ {t('signup.marketingBullet1')}</Text>
            <Text style={styles.marketingBullet} fontType="regular">✅ {t('signup.marketingBullet2')}</Text>
            <Text style={styles.marketingBullet} fontType="regular">✅ {t('signup.marketingBullet3')}</Text>
            <Text style={styles.marketingBullet} fontType="regular">✅ {t('signup.marketingBullet4')}</Text>
            <Text style={styles.marketingDescription} fontType="regular">{t('signup.marketingDescription2')}</Text>
          </View>
        )}
        {isLargeScreen && <View style={styles.separatorVertical} />}
        {!isLargeScreen && (
            <Link href={getLogoHref()} style={styles.smallScreenLogo} asChild>
              <Image source={Logo} resizeMode="contain" />
            </Link>
        )}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title} fontType="bold">{t('signup.createYourAccount')}</Text>
            <Text style={styles.description} fontType="regular">{t('signup.registerManagerAccount')}</Text>

            {errors.general && <View style={styles.errorContainer}><Text style={styles.errorText} fontType="regular">{errors.general}</Text></View>}

            <TextInput
              style={styles.input}
              placeholder={t('signup.fullNamePlaceholder')}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholderTextColor={theme.colors.bodyText}
            />
            {errors.fullName && <View style={styles.errorContainer}><Text style={styles.errorText} fontType="regular">{errors.fullName}</Text></View>}

            <TextInput
              style={styles.input}
              placeholder={t('signup.emailAddressPlaceholder')}
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
                placeholder={t('signup.passwordPlaceholder')}
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
              onPress={handleSignup}
              disabled={isSubmitting}
              style={styles.primaryButton}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText} fontType="regular">{t('signup.continueButton')}</Text>}
            </Button><Button
              title={t('signup.signUpWithGoogle')}
              onPress={() => Alert.alert(t('signup.signUpWithGoogle'), t('signup.googleSignupComingSoon'))}
              style={styles.googleButton}
            />

            <View style={styles.signInLinkContainer}>
              <Text style={styles.signInText} fontType="regular">{t('signup.alreadyHaveAccount')}</Text><Link href="/(guest)/login" asChild>
                <Text style={styles.signInLink} fontType="regular">{t('signup.signInLink')}</Text>
              </Link>
            </View>
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
    backgroundColor: theme.colors.background,
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
    color: theme.colors.headingText,
    marginBottom: theme.spacing(4),
    lineHeight: 48,
  },
  marketingDescription: {
    fontSize: 18,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(4),
    lineHeight: 28,
  },
  marketingBullet: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(1),
  },
  separatorVertical: {
    width: 1,
    backgroundColor: theme.colors.borderColor,
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing(2),
  },
  content: {
    justifyContent: 'center',
    padding: theme.spacing(4),
    backgroundColor: theme.colors.cardBackground,
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
    backgroundColor: theme.colors.errorBackground,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  errorText: {
    color: theme.colors.errorText,
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
    backgroundColor: theme.colors.background,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(2),
    backgroundColor: theme.colors.background,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.headingText,
    backgroundColor: theme.colors.background,
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
  googleButton: {
    backgroundColor: theme.colors.accent, // Using accent color for Google button
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(1),
    height: 50,
    justifyContent: 'center',
  },
  // googleButtonText is not used, as Button component's default text style is used
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
  },
  languageSelectorContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? theme.spacing(4) : theme.spacing(6),
    right: theme.spacing(4),
    zIndex: 100,
  },
});
