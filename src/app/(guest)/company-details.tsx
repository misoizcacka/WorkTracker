import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { InvitesContext } from '../(manager)/InvitesContext';
import { WorkersContext } from '../(manager)/WorkersContext';
import { theme } from '../../theme';
import { Button } from '../../components/Button';
import { Invite } from '../../types';
import AnimatedScreen from '../../components/AnimatedScreen';


export default function WorkerSignup() {
  const router = useRouter();
  const { invite: inviteToken } = useLocalSearchParams<{ invite: string }>();

  const invitesContext = useContext(InvitesContext);
  const workersContext = useContext(WorkersContext);

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<Invite | null>(null);
  
  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [optionalEmail, setOptionalEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      router.replace('/(guest)/invalid-invite');
      return;
    }
    if (invitesContext) {
      const foundInvite = invitesContext.getInviteByToken(inviteToken);
      if (foundInvite) {
        setInvite(foundInvite);
      } else {
        router.replace('/(guest)/invalid-invite');
      }
    }
    setLoading(false);
  }, [inviteToken, invitesContext, router]);

  const handleSignup = () => {
    if (!invite) return;

    if (invite.invitationMethod === 'email') {
      if (!password || !confirmPassword) {
        Alert.alert('Error', 'Please fill out all password fields.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters long.');
        return;
      }
    }

    if (invite.invitationMethod === 'phone') {
      if (!pin || !confirmPin) {
        Alert.alert('Error', 'Please fill out all PIN fields.');
        return;
      }
      if (pin !== confirmPin) {
        Alert.alert('Error', 'PINs do not match.');
        return;
      }
      if (pin.length < 4) {
        Alert.alert('Error', 'PIN must be at least 4 digits long.');
        return;
      }
    }

    setIsSubmitting(true);
    setTimeout(() => {
      if (workersContext && invitesContext) {
        const workerData = {
          full_name: invite.full_name,
          email: invite.invitationMethod === 'email' ? invite.email : optionalEmail,
          phone: invite.phone,
          pin: invite.invitationMethod === 'phone' ? pin : undefined,
        };
        workersContext.createWorker(workerData);
        invitesContext.updateInviteStatus(invite.token, 'used');
        router.replace('/(guest)/signup-success');
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
      setIsSubmitting(false);
    }, 1500);
  };

  if (loading || !invite) {
    return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
    );
  }

  const renderEmailForm = () => (
    <>
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholderTextColor="#999"
      />
    </>
  );

  const renderPhoneForm = () => (
    <>
      <TextInput
        style={styles.input}
        placeholder="Email (Optional)"
        value={optionalEmail}
        onChangeText={setOptionalEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="4-Digit PIN"
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm PIN"
        value={confirmPin}
        onChangeText={setConfirmPin}
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
        placeholderTextColor="#999"
      />
    </>
  );

  return (
    <AnimatedScreen>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.description}>
            You've been invited to join the team. Complete your profile to get started.
          </Text>

          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            value={invite.full_name}
            editable={false}
          />
          {invite.email && (
            <TextInput
              style={[styles.input, styles.readOnlyInput]}
              value={invite.email}
              editable={false}
            />
          )}
          {invite.phone && (
             <TextInput
              style={[styles.input, styles.readOnlyInput]}
              value={invite.phone}
              editable={false}
            />
          )}

          {invite.invitationMethod === 'email' ? renderEmailForm() : renderPhoneForm()}

          <Button
            onPress={handleSignup}
            disabled={isSubmitting}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          >
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Complete Signup</Text>}
          </Button>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
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
  readOnlyInput: {
    backgroundColor: '#f0f0f0',
    color: '#888',
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
});