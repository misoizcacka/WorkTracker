import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { InviteAcceptanceScreen } from '../../components/invite/InviteAcceptanceScreen';
import { Text } from '../../components/Themed';
import { theme } from '../../theme';
import { StoreButtons } from '../../components/StoreButtons';
import { InvitesContext } from '../../context/InvitesContext';
import { Invite } from '../../types';

function WebInviteRedirect({ token }: { token: string }) {
  useEffect(() => {
    if (!token || typeof window === 'undefined') {
      return;
    }

    const appUrl = `koordinate://join/${token}`;
    const userAgent = window.navigator.userAgent || '';
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

    const fallbackUrl = isIOS
      ? (process.env.EXPO_PUBLIC_APP_STORE_URL || 'https://apps.apple.com')
      : isAndroid
        ? (process.env.EXPO_PUBLIC_PLAY_STORE_URL || 'https://play.google.com/store')
        : '/mobile-only';

    const fallbackTimer = window.setTimeout(() => {
      window.location.replace(fallbackUrl);
    }, 1600);

    window.location.href = appUrl;

    return () => window.clearTimeout(fallbackTimer);
  }, [token]);

  return (
    <View style={styles.webContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.webTitle} fontType="bold">Opening Koordinate…</Text>
      <Text style={styles.webSubtitle} fontType="regular">
        If the app does not open automatically, install it and reopen this invite on your phone.
      </Text>
      <StoreButtons />
    </View>
  );
}

function WebJoinRoute({ token }: { token: string }) {
  const invitesContext = useContext(InvitesContext);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvite = async () => {
      try {
        const fetchedInvite = await invitesContext?.getInviteByToken(token);
        if (!fetchedInvite) {
          setError('This invite is invalid or has expired.');
          return;
        }

        setInvite(fetchedInvite);
      } catch (_e) {
        setError('Could not load this invite.');
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [invitesContext, token]);

  if (loading) {
    return (
      <View style={styles.webContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.webTitle} fontType="bold">Checking invite</Text>
      </View>
    );
  }

  if (error || !invite) {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.webTitle} fontType="bold">Invite Unavailable</Text>
        <Text style={styles.webSubtitle} fontType="regular">{error || 'This invite is no longer available.'}</Text>
      </View>
    );
  }

  if (invite.role === 'manager') {
    return <InviteAcceptanceScreen token={token} />;
  }

  return <WebInviteRedirect token={token} />;
}

export default function JoinByTokenRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();

  if (!token || Array.isArray(token)) {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.webTitle} fontType="bold">Invite Unavailable</Text>
        <Text style={styles.webSubtitle} fontType="regular">This invite link is missing its token.</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return <WebJoinRoute token={token} />;
  }

  return <InviteAcceptanceScreen token={token} />;
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
    backgroundColor: theme.colors.pageBackground,
  },
  webTitle: {
    fontSize: 24,
    color: theme.colors.headingText,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    textAlign: 'center',
  },
  webSubtitle: {
    fontSize: 15,
    color: theme.colors.bodyText,
    textAlign: 'center',
    maxWidth: 420,
  },
});
