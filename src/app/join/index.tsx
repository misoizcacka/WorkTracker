import React, { useContext, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Text } from '../../components/Themed';
import { Logo } from '../../components/Logo';
import { theme } from '../../theme';
import { InvitesContext } from '../../context/InvitesContext';
import { normalizeInviteCode } from '../../utils/invites';

export default function JoinIndexScreen() {
  const router = useRouter();
  const invitesContext = useContext(InvitesContext);
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinueWithCode = async () => {
    const normalizedCode = normalizeInviteCode(inviteCode);
    if (normalizedCode.length !== 6) {
      setError('Enter your 6-character invite code.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const invite = await invitesContext?.getInviteByCode(normalizedCode);
      if (!invite?.token) {
        setError('That invite code is invalid or has expired.');
        return;
      }

      router.push(`/join/${invite.token}`);
    } catch (_e) {
      setError('Could not validate that invite code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedScreen>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Logo />
        </View>
        <View style={styles.container}>
          <Card style={styles.card}>
            <Text style={styles.title} fontType="bold">Join Your Company</Text>
            <Text style={styles.subtitle} fontType="regular">
              Use the invite link from your manager. If you opened the app manually, enter the invite code below.
            </Text>

            <View style={styles.optionList}>
              <View style={styles.optionRow}>
                <Ionicons name="link-outline" size={22} color={theme.colors.primary} />
                <Text style={styles.optionText} fontType="regular">Tap the invite link sent by your manager on this phone.</Text>
              </View>
              <View style={styles.optionRow}>
                <Ionicons name="keypad-outline" size={22} color={theme.colors.primary} />
                <Text style={styles.optionText} fontType="regular">Or enter the 6-character invite code below.</Text>
              </View>
            </View>

            <TextInput
              style={styles.input}
              value={inviteCode}
              onChangeText={(value) => setInviteCode(normalizeInviteCode(value))}
              placeholder="AB7K92"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              placeholderTextColor={theme.colors.disabledText}
            />

            {error ? <Text style={styles.errorText} fontType="regular">{error}</Text> : null}

            <Button
              onPress={handleContinueWithCode}
              disabled={isSubmitting}
              style={styles.button}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText} fontType="regular">Continue with Code</Text>
              )}
            </Button>
          </Card>
        </View>
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
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    zIndex: 10,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing(3),
  },
  card: {
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    padding: theme.spacing(3.5),
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  title: {
    fontSize: 24,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.bodyText,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  optionList: {
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(3),
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.bodyText,
  },
  input: {
    height: 54,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing(2),
    fontSize: 22,
    color: theme.colors.headingText,
    backgroundColor: theme.colors.background,
    letterSpacing: 4,
    textAlign: 'center',
  },
  errorText: {
    color: theme.colors.errorText,
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    textAlign: 'center',
  },
  button: {
    marginTop: theme.spacing(2),
    height: 52,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
  },
});
