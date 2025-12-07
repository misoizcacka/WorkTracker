import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { InvitesContext } from '~/context/InvitesContext';
import { theme } from '../../theme';
import { Button } from '../../components/Button';
import { Invite } from '../../types';
import AnimatedScreen from '../../components/AnimatedScreen';


export default function WorkerSignup() {
  const router = useRouter();
  const { invite: inviteToken } = useLocalSearchParams<{ invite: string }>();

  const invitesContext = useContext(InvitesContext);

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<Invite | null>(null);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!inviteToken) {
        router.replace('/(guest)/invalid-invite');
        return;
      }
      if (invitesContext) {
        const foundInvite = await invitesContext.getInviteByToken(inviteToken);
        if (foundInvite) {
          setInvite(foundInvite);
        } else {
          router.replace('/(guest)/invalid-invite');
        }
      }
      setLoading(false);
    }
    fetchInvite();
  }, [inviteToken, invitesContext, router]);

  const handleSignup = () => {
    // This logic is deprecated and now handled by /auth/invite
    // Kept here to prevent breaking other potential dependencies on this function's existence.
  };

  if (loading || !invite) {
    return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
    );
  }

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

          <Button
            onPress={handleSignup}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          >
            <Text style={styles.primaryButtonText}>Complete Signup</Text>
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