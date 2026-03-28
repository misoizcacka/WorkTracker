import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform, Dimensions, Image, Pressable, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { useSession } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Text } from '../../components/Themed';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Logo } from '~/components/Logo';
import { supabase } from '../../utils/supabase';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 900;

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

  const handleSignup = async () => {
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
      return;
    }

    setErrors({});
    setIsSubmitting(true);

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
        setErrors({ general: error.message });
        return;
      }

      if (data.user) {
        const { data: edgeFunctionData, error: edgeFunctionError } = await supabase.functions.invoke('create-owner-and-company', {
          body: {
            userId: data.user.id,
            fullName: fullName,
            email: email,
            companyName: "New Company",
          }
        });

        if (edgeFunctionError) {
          setErrors({ general: t('signup.failedToFinalizeSetup') });
          return;
        }
        
        const { company } = edgeFunctionData;
        router.replace({ pathname: '/subscription/setup', params: { companyId: company.id } });
        refreshUser().catch((refreshError) => {
          console.error('Failed to refresh user after signup:', refreshError);
        });
      } else {
        setErrors({ general: t('signup.checkEmailConfirmation') });
      }
    } catch (error: any) {
      setErrors({ general: error.message || t('signup.unexpectedError') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        {/* Logo Header */}
        <View style={styles.header}>
          <Link href="/(guest)" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <Logo style={styles.logo} />
            </TouchableOpacity>
          </Link>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.mainLayout}>
            {/* Left Column: Marketing (Desktop Only) */}
            {isLargeScreen && (
              <View style={styles.marketingColumn}>
                <Text style={styles.marketingTitle} fontType="bold">
                  {t('signup.marketingTitle')}
                </Text>
                <Text style={styles.marketingSubtitle} fontType="regular">
                  {t('signup.marketingDescription')}
                </Text>

                <View style={styles.bulletList}>
                  <View style={styles.bulletItem}>
                    <View style={styles.bulletIcon}>
                      <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.bulletTextContainer}>
                      <Text style={styles.bulletTitle} fontType="bold">{t('signup.smartSchedulingTitle')}</Text>
                      <Text style={styles.bulletDescription} fontType="regular">
                        {t('signup.smartSchedulingDesc')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bulletItem}>
                    <View style={styles.bulletIcon}>
                      <Ionicons name="map-outline" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.bulletTextContainer}>
                      <Text style={styles.bulletTitle} fontType="bold">{t('signup.realTimeOversightTitle')}</Text>
                      <Text style={styles.bulletDescription} fontType="regular">
                        {t('signup.realTimeOversightDesc')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bulletItem}>
                    <View style={styles.bulletIcon}>
                      <Ionicons name="document-text-outline" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.bulletTextContainer}>
                      <Text style={styles.bulletTitle} fontType="bold">{t('signup.automatedReportingTitle')}</Text>
                      <Text style={styles.bulletDescription} fontType="regular">
                        {t('signup.automatedReportingDesc')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Right Column: Sign Up Form */}
            <View style={styles.formColumn}>
              <Card style={styles.signupCard}>
                <Text style={styles.title} fontType="bold">{t('signup.createYourAccount')}</Text>
                <Text style={styles.description} fontType="regular">{t('signup.registerManagerAccount')}</Text>

                {errors.general && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText} fontType="regular">{errors.general}</Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label} fontType="medium">{t('signup.fullNamePlaceholder')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    placeholderTextColor={theme.colors.disabledText}
                  />
                  {errors.fullName && <Text style={styles.fieldError} fontType="regular">{errors.fullName}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label} fontType="medium">{t('signup.emailAddressPlaceholder')}</Text>
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
                  <Text style={styles.label} fontType="medium">{t('signup.passwordPlaceholder')}</Text>
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

                <Button
                  onPress={handleSignup}
                  disabled={isSubmitting}
                  style={styles.signupButton}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.signupButtonText} fontType="regular">{t('signup.continueButton')}</Text>
                  )}
                </Button>

                <View style={styles.signInLinkContainer}>
                  <Text style={styles.signInText} fontType="regular">{t('signup.alreadyHaveAccount')}</Text>
                  <Link href="/(guest)/login" asChild>
                    <TouchableOpacity>
                      <Text style={styles.signInLink} fontType="regular">{t('signup.signInLink')}</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </Card>
            </View>
          </View>
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
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing(3),
    paddingTop: theme.spacing(10),
    justifyContent: 'center',
  },
  mainLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    gap: theme.spacing(8),
  },
  marketingColumn: {
    flex: 1,
    maxWidth: 500,
  },
  marketingTitle: {
    fontSize: 42,
    color: theme.colors.headingText,
    lineHeight: 52,
    marginBottom: theme.spacing(2),
  },
  marketingSubtitle: {
    fontSize: 18,
    color: theme.colors.bodyText,
    lineHeight: 28,
    marginBottom: theme.spacing(6),
  },
  bulletList: {
    gap: theme.spacing(4),
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
  },
  bulletIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletTextContainer: {
    flex: 1,
  },
  bulletTitle: {
    fontSize: 18,
    color: theme.colors.headingText,
    marginBottom: 4,
  },
  bulletDescription: {
    fontSize: 15,
    color: theme.colors.bodyText,
    lineHeight: 22,
  },
  formColumn: {
    flex: 1,
    maxWidth: 450,
    width: '100%',
  },
  signupCard: {
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
    marginBottom: theme.spacing(2),
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
  signupButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    height: 52,
    marginTop: theme.spacing(2),
    justifyContent: 'center',
  },
  signupButtonText: {
    color: 'white',
    fontSize: 16,
  },
  signInLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing(3),
    gap: 4,
  },
  signInText: {
    fontSize: 14,
    color: theme.colors.bodyText,
  },
  signInLink: {
    fontSize: 14,
    color: theme.colors.primary,
  },
});
