import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { InvitesContext } from '~/context/InvitesContext';
import { Button } from '../Button';
import { Text } from '../Themed';
import { supabase } from '~/utils/supabase';
import { Invite } from '~/types';
import { theme } from '~/theme';
import AnimatedScreen from '../AnimatedScreen';
import { Card } from '../Card';
import { Logo } from '../Logo';
import { useSession } from '~/context/AuthContext';

interface InviteAcceptanceScreenProps {
  token?: string;
}

export function InviteAcceptanceScreen({ token }: InviteAcceptanceScreenProps) {
  const router = useRouter();
  const invitesContext = useContext(InvitesContext);
  const { refreshUser } = useSession();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoadError('No invite token was provided.');
        setLoading(false);
        return;
      }

      try {
        const fetchedInvite = await invitesContext?.getInviteByToken(token);

        if (!fetchedInvite) {
          setLoadError('This invite is invalid.');
          setLoading(false);
          return;
        }

        if (fetchedInvite.used || fetchedInvite.status !== 'pending') {
          setLoadError('This invite has already been used.');
          setLoading(false);
          return;
        }

        if (fetchedInvite.expires_at && new Date(fetchedInvite.expires_at) <= new Date()) {
          setLoadError('This invite has expired. Ask your manager for a new link.');
          setLoading(false);
          return;
        }

        setInvite(fetchedInvite);
      } catch (_e) {
        setLoadError('Something went wrong while loading your invite.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token, invitesContext]);

  const handleJoin = async () => {
    if (!invite || !token) {
      return;
    }

    if (invite.role === 'manager' && password.length < 6) {
      setFormError('Enter a password with at least 6 characters.');
      return;
    }

    if (invite.role === 'manager' && password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const { data, error: acceptError } = await supabase.functions.invoke('accept-worker-invite', {
        body: {
          inviteToken: token,
          password: invite.role === 'manager' ? password : undefined,
        },
      });

      if (acceptError) {
        setFormError(acceptError.message || 'Could not accept this invite.');
        return;
      }

      const authEmail = (data as any)?.email as string | undefined;
      const authPassword = (data as any)?.password as string | undefined;

      if (!authEmail || !authPassword) {
        setFormError('The invite was accepted, but sign-in could not be completed.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (signInError) {
        setFormError(signInError.message || 'Could not sign you in automatically.');
        return;
      }

      await refreshUser();
      router.replace(invite.role === 'worker' ? '/(worker)/home' : '/(manager)/account');
    } catch (e: any) {
      setFormError(e.message || 'Could not join the company.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AnimatedScreen>
        <View style={styles.stateScreen}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText} fontType="regular">Checking your invite...</Text>
        </View>
      </AnimatedScreen>
    );
  }

  if (loadError || !invite) {
    return (
      <AnimatedScreen>
        <View style={styles.stateScreen}>
          <Card style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons name="alert-circle-outline" size={28} color={theme.colors.danger} />
            </View>
            <Text style={styles.errorTitle} fontType="bold">Invite Unavailable</Text>
            <Text style={styles.errorText} fontType="regular">{loadError || 'This invite is no longer available.'}</Text>
            <Button onPress={() => router.push(Platform.OS === 'web' ? '/' : '/join')} type="secondary" style={styles.secondaryButton} textStyle={styles.secondaryButtonText}>
              {Platform.OS === 'web' ? 'Return Home' : 'Use Invite Code'}
            </Button>
          </Card>
        </View>
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Link href={Platform.OS === 'web' ? '/' : '/join'} asChild>
            <TouchableOpacity activeOpacity={0.8}>
              <Logo />
            </TouchableOpacity>
          </Link>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Card style={styles.formCard}>
            <View style={styles.formIntro}>
              <View style={styles.formIntroBadge}>
                <Ionicons name="briefcase-outline" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.title} fontType="bold">
                Join {invite.company_name}
              </Text>
              <Text style={styles.subtitle} fontType="regular">
                {invite.role === 'manager'
                  ? 'Confirm your details and choose your password to access the web dashboard.'
                  : 'Confirm your details to continue.'}
              </Text>
            </View>

            <View style={styles.readonlyCard}>
              <View style={styles.readonlyRow}>
                <Text style={styles.readonlyLabel} fontType="bold">Name</Text>
                <Text style={styles.readonlyValue} fontType="regular">{invite.full_name}</Text>
              </View>
              <View style={styles.readonlyDivider} />
              <View style={styles.readonlyRow}>
                <Text style={styles.readonlyLabel} fontType="bold">Role</Text>
                <Text style={styles.readonlyValue} fontType="regular">{invite.role}</Text>
              </View>
              {invite.role === 'manager' && invite.email ? (
                <>
                  <View style={styles.readonlyDivider} />
                  <View style={styles.readonlyRow}>
                    <Text style={styles.readonlyLabel} fontType="bold">Email</Text>
                    <Text style={[styles.readonlyValue, styles.emailValue]} fontType="regular">{invite.email}</Text>
                  </View>
                </>
              ) : null}
            </View>

            {invite.role === 'manager' ? (
              <View style={styles.passwordSection}>
                <Text style={styles.inputLabel} fontType="bold">Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (formError) {
                        setFormError(null);
                      }
                    }}
                    placeholder="Create your password"
                    placeholderTextColor={theme.colors.bodyText}
                    secureTextEntry={!passwordVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                  />
                  <Pressable onPress={() => setPasswordVisible((current) => !current)} style={styles.passwordToggle}>
                    <Ionicons
                      name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.bodyText}
                    />
                  </Pressable>
                </View>
                <View style={[styles.passwordInputContainer, styles.confirmPasswordInputContainer]}>
                  <TextInput
                    style={styles.passwordInput}
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      if (formError) {
                        setFormError(null);
                      }
                    }}
                    placeholder="Confirm your password"
                    placeholderTextColor={theme.colors.bodyText}
                    secureTextEntry={!confirmPasswordVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                  />
                  <Pressable onPress={() => setConfirmPasswordVisible((current) => !current)} style={styles.passwordToggle}>
                    <Ionicons
                      name={confirmPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.bodyText}
                    />
                  </Pressable>
                </View>
                <Text style={styles.passwordHint} fontType="regular">Use at least 6 characters.</Text>
              </View>
            ) : null}

            {formError && <Text style={styles.formErrorText} fontType="regular">{formError}</Text>}

            <Button
              onPress={handleJoin}
              disabled={isSubmitting || (invite.role === 'manager' && (password.length < 6 || password !== confirmPassword))}
              style={styles.joinButton}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.joinButtonText} fontType="regular">Continue</Text>
              )}
            </Button>
          </Card>
        </ScrollView>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(4),
  },
  formCard: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: theme.spacing(3.5),
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  formIntro: {
    alignItems: 'center',
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
    fontSize: 24,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.bodyText,
    lineHeight: 22,
    textAlign: 'center',
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
    fontSize: 15,
    textTransform: 'capitalize',
  },
  emailValue: {
    textTransform: 'none',
  },
  readonlyDivider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
  },
  formErrorText: {
    color: theme.colors.errorText,
    textAlign: 'left',
    marginBottom: theme.spacing(2),
  },
  passwordSection: {
    marginBottom: theme.spacing(2),
  },
  inputLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing(1),
  },
  passwordInputContainer: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmPasswordInputContainer: {
    marginTop: theme.spacing(1.25),
  },
  passwordInput: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: theme.spacing(2),
    color: theme.colors.headingText,
    fontSize: 15,
  },
  passwordToggle: {
    minHeight: 52,
    width: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordHint: {
    color: theme.colors.bodyText,
    fontSize: theme.fontSizes.xs,
    marginTop: theme.spacing(0.75),
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing(1),
    height: 52,
    justifyContent: 'center',
  },
  joinButtonText: {
    color: 'white',
    fontSize: 15,
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
    fontSize: 15,
    color: theme.colors.bodyText,
  },
  errorTitle: {
    fontSize: 22,
    color: theme.colors.errorText,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
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
