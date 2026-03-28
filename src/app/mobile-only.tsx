import React from 'react';
import { View, StyleSheet, Image, Platform, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StoreButtons } from '../components/StoreButtons';
import { Text } from '../components/Themed';
import { useSession } from '../context/AuthContext';
import { theme } from '../theme';
import { Card } from '../components/Card';
import Logo from '../../assets/koordlogoblack1.svg';

export default function MobileOnlyScreen() {
  const router = useRouter();
  const { userRole, user, signOut } = useSession();
  const isManager = userRole === 'manager' || userRole === 'owner';
  const isSignedInWorkerOnWeb = Platform.OS === 'web' && !!user && userRole === 'worker';

  const handleLogoPress = async () => {
    if (isSignedInWorkerOnWeb) {
      await signOut();
      router.replace('/(guest)/login');
      return;
    }

    router.replace('/');
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(guest)/login');
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <Pressable
          onPress={handleLogoPress}
          style={({ pressed }) => [
            styles.logoButton,
            pressed ? styles.logoButtonPressed : null,
          ]}
        >
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
        </Pressable>

        <Card style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={isManager ? 'desktop-outline' : 'phone-portrait-outline'}
              size={34}
              color={isManager ? theme.colors.primary : theme.colors.secondary}
            />
          </View>

          <Text style={styles.title} fontType="bold">
            {isManager ? 'Desktop Access Required' : 'Mobile App Required'}
          </Text>

          <Text style={styles.subtitle} fontType="regular">
            {isManager
              ? 'Scheduling, maps, reports, and other manager tools need more screen space than this viewport currently provides.'
              : 'Use the app to clock in, track work, and handle daily operations on the go.'}
          </Text>

          {!isManager ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} fontType="medium">Download the app</Text>
              <StoreButtons />
              {isSignedInWorkerOnWeb ? (
                <Pressable onPress={handleSignOut} style={({ pressed }) => [styles.signOutButton, pressed ? styles.signOutButtonPressed : null]}>
                  <Text style={styles.signOutButtonText} fontType="medium">Sign out</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} fontType="medium">Manager tools available on desktop</Text>
              <View style={styles.featureList}>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                  <Text style={styles.featureText} fontType="regular">Advanced scheduling and assignments</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                  <Text style={styles.featureText} fontType="regular">Real-time map overview and replay tools</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                  <Text style={styles.featureText} fontType="regular">Reports, payroll review, and account controls</Text>
                </View>
              </View>

              <Text style={styles.helperText} fontType="regular">
                Zoom back out or click the Koord logo to return to the default page.
              </Text>
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(4),
  },
  logoButton: {
    marginBottom: theme.spacing(3),
    borderRadius: theme.radius.md,
  },
  logoButtonPressed: {
    opacity: 0.75,
  },
  logo: {
    width: 160,
    height: 46,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    padding: theme.spacing(4),
    alignItems: 'center',
    borderRadius: theme.radius.xl,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(17, 24, 39, 0.08)',
      },
      native: {
        elevation: 8,
      },
    }),
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
  },
  title: {
    fontSize: 24,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    width: '100%',
    marginTop: theme.spacing(4),
    paddingTop: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  sectionTitle: {
    fontSize: 14,
    color: theme.colors.disabledText,
    marginBottom: theme.spacing(2),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  featureList: {
    gap: theme.spacing(1.5),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  helperText: {
    marginTop: theme.spacing(3),
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.disabledText,
    textAlign: 'center',
  },
  signOutButton: {
    marginTop: theme.spacing(3),
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonPressed: {
    opacity: 0.8,
  },
  signOutButtonText: {
    fontSize: 15,
    color: theme.colors.headingText,
  },
});
