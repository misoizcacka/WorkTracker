import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { InvitesContext } from '~/context/InvitesContext';
import ThemedInput from '../../../components/ThemedInput';
import { Button } from '../../../components/Button';
import { supabase } from '../../../utils/supabase';
import { Invite } from '../../../types';
import { theme } from '../../../theme';

const InviteSignUpScreen = () => {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const invitesContext = useContext(InvitesContext);

  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('No invite token provided.');
        setLoading(false);
        return;
      }

      try {
        const fetchedInvite = await invitesContext?.getInviteByToken(token);

        if (!fetchedInvite) {
          setError('This invite is invalid.');
          setLoading(false);
          return;
        }

        if (fetchedInvite.status !== 'pending') {
          setError('This invite has already been used.');
          setLoading(false);
          return;
        }

        const createdAt = new Date(fetchedInvite.created_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (createdAt < sevenDaysAgo) {
          setError('This invite has expired.');
          setLoading(false);
          return;
        }

        setInvite(fetchedInvite);
      } catch (e) {
        setError('An error occurred while verifying your invite.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token, invitesContext]);

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    if (!invite) {
      setFormError("Invite details are missing.");
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
        setFormError("User signup failed unexpectedly.");
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
        setFormError(employeeCreationError.message || "Failed to finalize account setup.");
        setIsSubmitting(false);
        // Consider rolling back the auth.user creation here if this is critical
        return;
      }

      // IMPORTANT: Sign out the user immediately after signup to prevent auto-login on web
      await supabase.auth.signOut();

      // Redirect to the signup success page
      router.replace(`/(guest)/signup-success?role=${invite.role}`);

    } catch (e: any) {
      setFormError(e.message || 'An unexpected error occurred during sign-up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.infoText}>Verifying your invitation…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Invitation Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button onPress={() => router.push('/')}>
          <Text>Return Home</Text>
        </Button>
      </View>
    );
  }

  if (!invite) return null;

  return (
    <View style={styles.formContainer}>
      {/* Welcome Header */}
      <Text style={styles.title}>🎉 Welcome to {invite.company_name}!</Text>
      <Text style={styles.subtitle}>
        You’ve been invited to join the team as a {invite.role}.
      </Text>

      {/* Preview of Their Account */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Full Name</Text>
        <ThemedInput value={invite.full_name} editable={false} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <ThemedInput value={invite.email} editable={false} />
      </View>

      {/* Password fields */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password</Text>
        <ThemedInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Create a password"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirm Password</Text>
        <ThemedInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Re-enter password"
        />
      </View>

      {formError && <Text style={styles.formErrorText}>{formError}</Text>}

      <Button
        onPress={handleSignUp}
        disabled={isSubmitting}
        style={styles.signupButton}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.signupButtonText}>Create Account</Text>
        )}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(2),
    backgroundColor: theme.colors.pageBackground,
  },

  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(4),
    backgroundColor: 'white',
    maxWidth: 500,
    width: '100%',
    marginHorizontal: 'auto',
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
    fontWeight: '700',
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
    fontWeight: '500',
  },

  inputGroup: {
    marginBottom: theme.spacing(2),
  },

  infoText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.bodyText,
  },

  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 8,
    textAlign: 'center',
  },

  errorText: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: 20,
  },

  formErrorText: {
    color: 'red',
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
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default InviteSignUpScreen;
