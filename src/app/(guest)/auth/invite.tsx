import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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
      const { data, error: signUpError } = await supabase.auth.signUp({
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
      
      // The user is signed up, but email confirmation is likely required.
      // Update the invite status to 'accepted'.
      await invitesContext?.updateInviteStatus(invite.token, 'accepted');

      // Redirect user to a page that informs them to check their email to confirm.
      router.replace(`/(guest)/signup-success?role=${invite.role}`);

    } catch (e: any) {
      setFormError(e.message || 'An unexpected error occurred during sign up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.infoText}>Verifying your invite...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Invalid Invitation</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button onPress={() => router.push('/')}>
            <Text>Go to Homepage</Text>
        </Button>
      </View>
    );
  }

  if (invite) {
    return (
      <View style={styles.formContainer}>
        <Text style={styles.title}>Create Your Account</Text>
        
        <View>
          <Text style={styles.label}>Full Name</Text>
          <ThemedInput
            value={invite.full_name}
            editable={false}
          />
        </View>

        <View>
          <Text style={styles.label}>Email</Text>
          <ThemedInput
            value={invite.email}
            editable={false}
          />
        </View>

        <View>
          <Text style={styles.label}>Role</Text>
          <ThemedInput
            value={invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
            editable={false}
          />
        </View>
        
        <View>
          <Text style={styles.label}>Password</Text>
          <ThemedInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
          />
        </View>

        <View>
          <Text style={styles.label}>Confirm Password</Text>
          <ThemedInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Confirm your password"
          />
        </View>

        {formError && <Text style={styles.formErrorText}>{formError}</Text>}
        <Button onPress={handleSignUp} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text>Sign Up</Text>}
        </Button>
      </View>
    );
  }

  return null; // Should not be reached
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  label: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginBottom: 8,
    fontWeight: '500',
  },
  infoText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 30,
    textAlign: 'center',
  },
  formErrorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 15,
  },
});

export default InviteSignUpScreen;