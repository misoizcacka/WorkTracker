import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, ScrollView, Platform, Dimensions, Image, Pressable, TouchableOpacity, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Text } from '../../components/Themed';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import Logo from '../../../assets/koordlogoblack1.png';
import { supabase } from '../../utils/supabase';
import { useSession } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export default function Login() {
  const { refreshUser, user, userRole } = useSession()!;
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

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
        setErrors({ general: t('login.errors.invalidCredentials') });
        console.error('Login error:', error.message);
      } else {
        await refreshUser();
      }
    } catch (error: any) {
      setErrors({ general: error.message });
      console.error('Unexpected login error:', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = () => {
    if (Platform.OS === 'web') {
      router.push('/(guest)/pricing');
    } else {
      // On mobile, redirect to browser signup page
      Linking.openURL('https://work-tracker-ji0vqcxsb-misoizcackas-projects.vercel.app/auth/signup');
    }
  };

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        {/* Header with Logo in top left */}
        <View style={styles.header}>
          {Platform.OS === 'web' ? (
            <Link href="/(guest)" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Image source={Logo} style={styles.logo} resizeMode="contain" />
              </TouchableOpacity>
            </Link>
          ) : (
            <Image source={Logo} style={styles.logo} resizeMode="contain" />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.loginCard}>
            <Text style={styles.title} fontType="bold">{t('login.loginHeading')}</Text>
            <Text style={styles.description} fontType="regular">{t('login.loginDescription')}</Text>

            {errors.general && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText} fontType="regular">{errors.general}</Text>
              </View>
            )}
            
            <View style={styles.inputGroup}>
              <Text style={styles.label} fontType="medium">{t('login.emailPlaceholder')}</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.colors.disabledText}
              />
              {errors.email && <Text style={styles.fieldError} fontType="regular">{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label} fontType="medium">{t('login.passwordPlaceholder')}</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  placeholderTextColor={theme.colors.disabledText}
                />
                <Pressable onPress={() => setPasswordVisible(!passwordVisible)} style={styles.passwordToggle}>
                  <Feather
                    name={passwordVisible ? 'eye' : 'eye-off'}
                    size={20}
                    color={theme.colors.iconColor}
                  />
                </Pressable>
              </View>
              {errors.password && <Text style={styles.fieldError} fontType="regular">{errors.password}</Text>}
            </View>

            {Platform.OS === 'web' && (
              <View style={styles.forgotPasswordContainer}>
                <Link href="/(guest)/forgot-password" asChild>
                  <TouchableOpacity>
                    <Text style={styles.forgotPasswordLink} fontType="regular">{t('login.forgotPassword')}</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            )}

            <Button
              onPress={handleLogin}
              disabled={isSubmitting}
              style={[styles.loginButton, Platform.OS !== 'web' && { marginTop: theme.spacing(2) }]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText} fontType="regular">{t('login.loginButton')}</Text>
              )}
            </Button>

            <View style={styles.separatorContainer}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText} fontType="regular">{t('login.or')}</Text>
              <View style={styles.separatorLine} />
            </View>

            <Button
              title={t('login.signUpButton')}
              onPress={handleSignUp}
              style={styles.signUpButton}
              textStyle={styles.signUpButtonText}
            />
          </Card>
        </ScrollView>
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
    position: 'absolute',
    top: 0,
    left: 0,
    padding: theme.spacing(4),
    zIndex: 10,
  },
  logo: {
    width: 120,
    height: 36,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(3),
    paddingTop: theme.spacing(10), // Space for header
  },
  loginCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.xl,
    padding: theme.spacing(5),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      native: {
        elevation: 10,
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
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.errorText,
  },
  errorText: {
    color: theme.colors.errorText,
    textAlign: 'center',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: theme.spacing(2.5),
  },
  label: {
    fontSize: 14,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
    marginLeft: 4,
  },
  input: {
    height: 52,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.headingText,
    backgroundColor: theme.colors.background,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
  },
  passwordInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.headingText,
  },
  passwordToggle: {
    padding: theme.spacing(1.5),
  },
  fieldError: {
    color: theme.colors.errorText,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing(4),
  },
  forgotPasswordLink: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    height: 52,
    justifyContent: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: theme.spacing(4),
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderColor,
  },
  separatorText: {
    marginHorizontal: theme.spacing(2),
    color: theme.colors.disabledText,
    fontSize: 14,
  },
  signUpButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    height: 52,
    justifyContent: 'center',
  },
  signUpButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
  },
});
