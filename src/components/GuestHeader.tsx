import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Text } from './Themed';
import { Logo } from './Logo';
import { theme } from '../theme';

type GuestHeaderVariant = 'landing' | 'auth' | 'content';

/**
 * Shared header for all (guest) pages.
 *
 * Variants:
 *   landing  — logo + Pricing + Sign In + Get Started  (index)
 *   auth     — logo + Sign In / Create account links   (login, signup)
 *   content  — logo only, sticky bar                   (terms, privacy, dpa, legal-notice, payment pages)
 */
interface GuestHeaderProps {
  variant?: GuestHeaderVariant;
  /** Override the right-side action label on auth variant (default: 'Sign In') */
  authAction?: 'signin' | 'signup';
}

export function GuestHeader({ variant = 'content', authAction = 'signin' }: GuestHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.inner}>
        {/* Logo — always links home on web */}
        {Platform.OS === 'web' ? (
          <Link href="/(guest)" asChild>
            <TouchableOpacity activeOpacity={0.8}>
              <Logo size="medium" />
            </TouchableOpacity>
          </Link>
        ) : (
          <Logo size="medium" />
        )}

        {/* Right side */}
        {variant === 'landing' && (
          <View style={styles.right}>
            <Link href="/(guest)/pricing" asChild>
              <TouchableOpacity>
                <Text style={styles.navLink} fontType="medium">Pricing</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/(guest)/login" asChild>
              <TouchableOpacity style={styles.ghostBtn}>
                <Text style={styles.ghostBtnLabel} fontType="medium">Sign In</Text>
              </TouchableOpacity>
            </Link>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth/signup')}>
              <Text style={styles.primaryBtnLabel} fontType="medium">Get Started</Text>
            </TouchableOpacity>
          </View>
        )}

        {variant === 'auth' && authAction === 'signin' && (
          <View style={styles.right}>
            <Text style={styles.subtleText} fontType="regular">Already have an account?</Text>
            <Link href="/(guest)/login" asChild>
              <TouchableOpacity style={styles.ghostBtn}>
                <Text style={styles.ghostBtnLabel} fontType="medium">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}

        {variant === 'auth' && authAction === 'signup' && (
          <View style={styles.right}>
            <Text style={styles.subtleText} fontType="regular">No account yet?</Text>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push('/auth/signup')}>
              <Text style={styles.ghostBtnLabel} fontType="medium">Get Started</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* variant === 'content' → logo only, nothing on the right */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    zIndex: 100,
    ...Platform.select({ web: { position: 'sticky' as any, top: 0 } }),
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(2),
    maxWidth: 1160,
    width: '100%',
    alignSelf: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
  },
  navLink: {
    fontSize: 14,
    color: theme.colors.bodyText,
    paddingHorizontal: theme.spacing(1),
  },
  subtleText: {
    fontSize: 13,
    color: theme.colors.disabledText,
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
  },
  ghostBtnLabel: {
    fontSize: 14,
    color: theme.colors.headingText,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2.5),
    paddingVertical: theme.spacing(1),
  },
  primaryBtnLabel: {
    fontSize: 14,
    color: '#fff',
  },
});
