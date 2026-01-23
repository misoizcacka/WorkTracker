import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform, Dimensions, Image, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import Logo from '../../../assets/logokoordwhite.png';
import { supabase } from '../../utils/supabase';
import { useSession } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../../components/LanguageSelector';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function Login() {
  const { refreshUser } = useSession()!; // Get refreshUser
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

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

  return (
    <AnimatedScreen>
      <View style={styles.outerContainer}>
        {isLargeScreen && (
          <View style={styles.marketingContainer}>
            <Image source={Logo} style={styles.marketingLogo} resizeMode="contain" />
            <Text style={styles.marketingTitle}>{t('login.marketingTitle')}</Text>
            <Text style={styles.marketingDescription}>{t('login.marketingDescription')}</Text>
            <Text style={styles.marketingBullet}>✅ {t('login.marketingBullet1')}</Text>
            <Text style={styles.marketingBullet}>✅ {t('login.marketingBullet2')}</Text>
            <Text style={styles.marketingBullet}>✅ {t('login.marketingBullet3')}</Text>
            <Text style={styles.marketingBullet}>✅ {t('login.marketingBullet4')}</Text>
            <Text style={styles.marketingDescription}>{t('login.marketingDescription2')}</Text>
          </View>
        )}
        {!isLargeScreen && (
            <Image source={Logo} style={styles.smallScreenLogo} resizeMode="contain" />
        )}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>{t('login.loginHeading')}</Text>
            <Text style={styles.description}>{t('login.loginDescription')}</Text>

            {errors.general && <View style={styles.errorContainer}><Text style={styles.errorText}>{errors.general}</Text></View>}
            
            <TextInput
              style={styles.input}
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
            {errors.email && <View style={styles.errorContainer}><Text style={styles.errorText}>{errors.email}</Text></View>}

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                placeholderTextColor="#999"
              />
              <Pressable onPress={() => setPasswordVisible(!passwordVisible)} style={styles.passwordToggle}>
                <Feather
                  name={passwordVisible ? 'eye' : 'eye-off'}
                  size={20}
                  color={theme.colors.iconColor}
                />
              </Pressable>
            </View>
            {errors.password && <View style={styles.errorContainer}><Text style={styles.errorText}>{errors.password}</Text></View>}

            <Button
              onPress={handleLogin}
              disabled={isSubmitting}
              style={styles.primaryButton}
              textStyle={styles.primaryButtonText}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('login.loginButton')}</Text>}
            </Button>

            <View style={styles.linkContainer}>
                <Link href="/(guest)/forgot-password" style={styles.forgotPasswordLink}>
                    {t('login.forgotPassword')}
                </Link>
            </View>


            <View style={styles.separatorContainer}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>{t('login.or')}</Text>
              <View style={styles.separatorLine} />
            </View>

            <Button
              title={t('login.signUpButton')}
              onPress={() => router.push('/auth/signup')}
              style={styles.secondaryButton}
              textStyle={styles.secondaryButtonText}
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
  },
  description: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
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
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(2),
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.headingText,
    backgroundColor: 'white',
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
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(1),
    height: 50,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  linkContainer: {
      alignItems: 'flex-end',
      marginBottom: theme.spacing(2),
  },
  forgotPasswordLink: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
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