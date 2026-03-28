import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { InvitesContext } from '~/context/InvitesContext';
import ThemedInput from '../../../components/ThemedInput';
import { Button } from '../../../components/Button';
import { Text } from '../../../components/Themed';
import { supabase } from '../../../utils/supabase';
import { Invite } from '../../../types';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { Logo } from '~/components/Logo';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 900;

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
  const [passwordVisible, setPasswordVisible] = useState(false);
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
        password,
        options: {
          data: {
            full_name: invite.full_name,
            role: invite.role,
          },
        },
      });

      if (signUpError) {
        setFormError(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      if (!signUpData.user) {
        setFormError(t('signup.userSignupFailed'));
        setIsSubmitting(false);
        return;
      }

      const { error: employeeCreationError } = await supabase.functions.invoke('create-employee-from-invite', {
        body: {
          userId: signUpData.user.id,
          inviteId: invite.id,
          inviteToken: invite.token,
          fullName: invite.full_name,
          email: invite.email,
          role: invite.role,
          companyId: invite.company_id,
        },
      });

      if (employeeCreationError) {
        setFormError(employeeCreationError.message || t('signup.failedToFinalizeSetup'));
        setIsSubmitting(false);
        return;
      }

      await supabase.auth.signOut();
      router.replace(`/(guest)/signup-success?role=${invite.role}`);
    } catch (e: any) {
      setFormError(e.message || t('signup.unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AnimatedScreen>
        <View style={styles.stateScreen}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText} fontType="regular">{t('signup.verifyingInvitation')}</Text>
        </View>
      </AnimatedScreen>
    );
  }

  if (error) {
    return (
      <AnimatedScreen>
        <View style={styles.stateScreen}>
          <Card style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons name="alert-circle-outline" size={28} color={theme.colors.danger} />
            </View>
            <Text style={styles.errorTitle} fontType="bold">{t('signup.invitationError')}</Text>
            <Text style={styles.errorText} fontType="regular">{error}</Text>
            <Button onPress={() => router.push('/')} type="secondary" style={styles.secondaryButton} textStyle={styles.secondaryButtonText}>
              {t('signup.returnHome')}
            </Button>
          </Card>
        </View>
      </AnimatedScreen>
    );
  }

  if (!invite) return null;

  return (
    <AnimatedScreen>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Link href="/" asChild>
            <TouchableOpacity activeOpacity={0.8}>
              <Logo />
            </TouchableOpacity>
          </Link>
          <Link href="/(guest)/login" asChild>
            <TouchableOpacity style={styles.headerLink}>
              <Text style={styles.headerLinkText} fontType="medium">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.layout}>
            {isLargeScreen && (
              <View style={styles.infoPanel}>
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeText} fontType="medium">TEAM INVITE</Text>
                </View>
                <Text style={styles.infoTitle} fontType="bold">
                  Join {invite.company_name} and finish your account setup.
                </Text>
                <Text style={styles.infoDescription} fontType="regular">
                  Your invite is ready. Confirm your details, choose a secure password, and complete signup in one step.
                </Text>
                <View style={styles.infoList}>
                  <View style={styles.infoListItem}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                    <Text style={styles.infoListText} fontType="regular">Your role and company are already linked to this invitation.</Text>
                  </View>
                  <View style={styles.infoListItem}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                    <Text style={styles.infoListText} fontType="regular">Set your password once and you are ready to start.</Text>
                  </View>
                  <View style={styles.infoListItem}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                    <Text style={styles.infoListText} fontType="regular">After signup, the account setup is completed automatically.</Text>
                  </View>
                </View>
              </View>
            )}

            <Card style={styles.formCard}>
              <View style={styles.formIntro}>
                <View style={styles.formIntroBadge}>
                  <Ionicons name="mail-open-outline" size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.title} fontType="bold">
                  {t('signup.welcomeToCompany')} {invite.company_name}
                </Text>
                <Text style={styles.subtitle} fontType="regular">
                  {t('signup.invitedToJoin')} {invite.role}. Finish setup below.
                </Text>
              </View>

              <View style={styles.readonlyCard}>
                <View style={styles.readonlyRow}>
                  <Text style={styles.readonlyLabel} fontType="bold">{t('signup.fullNameLabel')}</Text>
                  <Text style={styles.readonlyValue} fontType="regular">{invite.full_name}</Text>
                </View>
                <View style={styles.readonlyDivider} />
                <View style={styles.readonlyRow}>
                  <Text style={styles.readonlyLabel} fontType="bold">{t('signup.emailLabel')}</Text>
                  <Text style={styles.readonlyValue} fontType="regular">{invite.email}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label} fontType="bold">{t('signup.passwordLabel')}</Text>
                <View style={styles.passwordInputContainer}>
                  <ThemedInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    placeholder={t('signup.createPasswordPlaceholder')}
                    style={styles.themedInputFlex}
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
                <Text style={styles.label} fontType="bold">{t('signup.confirmPasswordLabel')}</Text>
                <View style={styles.passwordInputContainer}>
                  <ThemedInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!passwordVisible}
                    placeholder={t('signup.reEnterPasswordPlaceholder')}
                    style={styles.themedInputFlex}
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
            </Card>
          </View>
        </ScrollView>
      </View>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
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
  },
  headerLink: {
    backgroundColor: theme.colors.pageBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1.25),
  },
  headerLinkText: {
    color: theme.colors.headingText,
    fontSize: theme.fontSizes.sm,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(4),
  },
  layout: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    flexDirection: isLargeScreen ? 'row' : 'column',
    gap: theme.spacing(3),
    alignItems: 'stretch',
  },
  infoPanel: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(5),
    justifyContent: 'center',
  },
  infoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary + '15',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.75),
    marginBottom: theme.spacing(3),
  },
  infoBadgeText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.xs,
    letterSpacing: 0.6,
  },
  infoTitle: {
    fontSize: 36,
    lineHeight: 42,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  infoDescription: {
    fontSize: 17,
    color: theme.colors.bodyText,
    lineHeight: 27,
    marginBottom: theme.spacing(3),
  },
  infoList: {
    gap: theme.spacing(2),
  },
  infoListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
  },
  infoListText: {
    flex: 1,
    color: theme.colors.bodyText,
    fontSize: 15,
    lineHeight: 23,
  },
  formCard: {
    flex: isLargeScreen ? 0.92 : undefined,
    width: '100%',
    maxWidth: isLargeScreen ? undefined : 680,
    alignSelf: 'center',
    padding: theme.spacing(4),
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  formIntro: {
    alignItems: 'flex-start',
    marginBottom: theme.spacing(3),
  },
  formIntroBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  title: {
    fontSize: 28,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.bodyText,
    lineHeight: 24,
  },
  readonlyCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing(3),
    overflow: 'hidden',
  },
  readonlyRow: {
    paddingHorizontal: theme.spacing(2.5),
    paddingVertical: theme.spacing(2),
  },
  readonlyLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  readonlyValue: {
    color: theme.colors.headingText,
    fontSize: theme.fontSizes.md,
  },
  readonlyDivider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
  },
  inputGroup: {
    marginBottom: theme.spacing(2),
  },
  label: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(1),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.pageBackground,
  },
  themedInputFlex: {
    flex: 1,
    borderWidth: 0,
  },
  passwordToggle: {
    padding: theme.spacing(2),
  },
  formErrorText: {
    color: theme.colors.errorText,
    textAlign: 'left',
    marginBottom: theme.spacing(2),
  },
  signupButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing(1),
    height: 52,
    justifyContent: 'center',
  },
  signupButtonText: {
    color: 'white',
    fontSize: 16,
  },
  stateScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.colors.pageBackground,
  },
  stateCard: {
    width: '100%',
    maxWidth: 460,
    padding: theme.spacing(4),
    alignItems: 'center',
    borderRadius: theme.radius.xl,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.danger + '14',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  stateText: {
    marginTop: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  errorTitle: {
    fontSize: 22,
    color: theme.colors.errorText,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: 20,
  },
  secondaryButton: {
    borderRadius: theme.radius.md,
    minHeight: 46,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
});

export default InviteSignUpScreen;
