import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, Dimensions, Image, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { InvitesContext } from '~/context/InvitesContext';
import ThemedInput from '../../../components/ThemedInput';
import { Button } from '../../../components/Button';
import { Text } from '../../../components/Themed'; // Import Themed Text
import { supabase } from '../../../utils/supabase';
import { Invite } from '../../../types';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import Logo from '../../../../assets/logokoordblack.png';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { Feather } from '@expo/vector-icons'; // For password toggle

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

const InviteSignUpScreen = () => {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const invitesContext = useContext(InvitesContext);
  const { t } = useTranslation();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false); // Added for password toggle
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError(t('signup.noInviteToken'));
        setLoading(false);
        return;
      }

      try {
        const fetchedInvite = await invitesContext?.getInviteByToken(token);

        if (!fetchedInvite) {
          setError(t('signup.invalidInvite'));
          setLoading(false);
          return;
        }

        if (fetchedInvite.status !== 'pending') {
          setError(t('signup.inviteUsed'));
          setLoading(false);
          return;
        }

        const createdAt = new Date(fetchedInvite.created_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (createdAt < sevenDaysAgo) {
          setError(t('signup.inviteExpired'));
          setLoading(false);
          return;
        }

        setInvite(fetchedInvite);
      } catch (e) {
        setError(t('signup.unexpectedError'));
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token, invitesContext, t]);

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      setFormError(t('signup.passwordsDoNotMatch'));
      return;
    }
    if (!invite) {
      setFormError(t('signup.inviteDetailsMissing'));
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password: password,
        options: {
          data: {
            full_name: invite.full_name,
            role: invite.role,
          }
        }
      });

      if (signUpError) {
        setFormError(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      // Ensure user was created successfully
      if (!signUpData.user) {
        setFormError(t('signup.userSignupFailed'));
        setIsSubmitting(false);
        return;
      }

      // Call the Edge Function to create the employee and update invite status
      const { data: employeeCreationData, error: employeeCreationError } = await supabase.functions.invoke('create-employee-from-invite', {
        body: {
          userId: signUpData.user.id,
          inviteId: invite.id,       // Pass invite ID
          inviteToken: invite.token,  // Pass invite token for verification
          fullName: invite.full_name,
          email: invite.email,
          role: invite.role,
          companyId: invite.company_id,
        }
      });

      if (employeeCreationError) {
        console.error("Error calling create-employee-from-invite Edge Function:", employeeCreationError);
        setFormError(employeeCreationError.message || t('signup.failedToFinalizeSetup'));
        setIsSubmitting(false);
        // Consider rolling back the auth.user creation here if this is critical
        return;
      }

      // IMPORTANT: Sign out the user immediately after signup to prevent auto-login on web
      await supabase.auth.signOut();

      // Redirect to the signup success page
      router.replace(`/(guest)/signup-success?role=${invite.role}`);

    } catch (e: any) {
      setFormError(e.message || t('signup.unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.infoText} fontType="regular">{t('signup.verifyingInvitation')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle} fontType="bold">{t('signup.invitationError')}</Text>
        <Text style={styles.errorText} fontType="regular">{error}</Text>
        <Button onPress={() => router.push('/')} textStyle={{ color: theme.colors.primary }} type="secondary">
          <Text fontType="regular">{t('signup.returnHome')}</Text>
        </Button>
      </View>
    );
  }

  if (!invite) return null;

  return (
    <AnimatedScreen>
      <View style={styles.outerContainer}>
        {isLargeScreen && (
          <View style={styles.marketingContainer}>
            <Link href="/" style={styles.marketingLogo} asChild>
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
            <Link href="/" style={styles.smallScreenLogo} asChild>
              <Image source={Logo} resizeMode="contain" />
            </Link>
        )}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title} fontType="bold">🎉 {t('signup.welcomeToCompany')} {invite.company_name}!</Text>
            <Text style={styles.subtitle} fontType="regular">
              {t('signup.invitedToJoin')} {invite.role}.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label} fontType="regular">{t('signup.fullNameLabel')}</Text>
              <ThemedInput value={invite.full_name} editable={false} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label} fontType="regular">{t('signup.emailLabel')}</Text>
              <ThemedInput value={invite.email} editable={false} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label} fontType="regular">{t('signup.passwordLabel')}</Text>
              <View style={styles.passwordInputContainer}>
                <ThemedInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  placeholder={t('signup.createPasswordPlaceholder')}
                  style={styles.themedInputFlex} // To allow passwordToggle to sit next to it
                />
                <Pressable onPress={() => setPasswordVisible(!passwordVisible)} style={styles.passwordToggle}>
                  <Feather
                    name={passwordVisible ? 'eye' : 'eye-off'}
                    size={20}
                    color={theme.colors.iconColor}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label} fontType="regular">{t('signup.confirmPasswordLabel')}</Text>
              <View style={styles.passwordInputContainer}>
                <ThemedInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!passwordVisible}
                  placeholder={t('signup.reEnterPasswordPlaceholder')}
                  style={styles.themedInputFlex} // To allow passwordToggle to sit next to it
                />
                <Pressable onPress={() => setPasswordVisible(!passwordVisible)} style={styles.passwordToggle}>
                  <Feather
                    name={passwordVisible ? 'eye' : 'eye-off'}
                    size={20}
                    color={theme.colors.iconColor}
                  />
                </Pressable>
              </View>
            </View>

            {formError && <Text style={styles.formErrorText} fontType="regular">{formError}</Text>}

            <Button
              onPress={handleSignUp}
              disabled={isSubmitting}
              style={styles.signupButton}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signupButtonText} fontType="regular">{t('signup.createAccount')}</Text>
              )}
            </Button>
          </View>
        </ScrollView>
      </View>
      <View style={styles.languageSelectorContainer}>
        <LanguageSelector />
      </View>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    flexDirection: isLargeScreen ? 'row' : 'column',
  },
  marketingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background, // Consistent with overall background
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
    height: '100%', // Take full height
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing(2),
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(2),
    backgroundColor: theme.colors.background, // Consistent background
  },
  infoText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  errorTitle: {
    fontSize: 22,
    color: theme.colors.errorText, // Consistent error text color
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: 20,
  },
  content: {
    justifyContent: 'center',
    padding: theme.spacing(4),
    backgroundColor: theme.colors.cardBackground, // Consistent card background
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
      },
    }),
  },
  title: {
    fontSize: 26,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
  },
  label: {
    fontSize: 15,
    color: theme.colors.bodyText,
    marginBottom: 6,
  },
  inputGroup: {
    marginBottom: theme.spacing(2),
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    // ThemedInput handles its own background, but this container might need one too if it wraps
    backgroundColor: theme.colors.background,
  },
  themedInputFlex: { // Style for ThemedInput to take flex: 1
    flex: 1,
    borderWidth: 0, // ThemedInput already has border, remove from wrapper
  },
  passwordToggle: {
    padding: theme.spacing(2),
  },
  formErrorText: {
    color: theme.colors.errorText, // Consistent error text color
    textAlign: 'center',
    marginBottom: theme.spacing(2),
  },
  signupButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
    height: 50,
    justifyContent: 'center',
  },
  signupButtonText: {
    color: 'white',
    fontSize: 16,
  },
  languageSelectorContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? theme.spacing(4) : theme.spacing(6), // Adjust for notch on native
    right: theme.spacing(4),
    zIndex: 100, // Ensure it's above other content
  },
});

export default InviteSignUpScreen;