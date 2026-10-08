import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Modal, SafeAreaView, useWindowDimensions } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Text } from './Themed';
import { Logo } from './Logo';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

type GuestHeaderVariant = 'landing' | 'auth' | 'content';

interface GuestHeaderProps {
  variant?: GuestHeaderVariant;
  authAction?: 'signin' | 'signup';
  /** Suppress the mobile hamburger menu — use on flow pages (payment, subscription setup) */
  noMenu?: boolean;
}

// Breakpoint at which the hamburger appears
const MOBILE_BREAKPOINT = 700;

export function GuestHeader({ variant = 'content', authAction = 'signin', noMenu = false }: GuestHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);

  // Show hamburger on landing/content on narrow screens, unless noMenu is set
  const isMobile = width < MOBILE_BREAKPOINT;
  const showHamburger = !noMenu && (variant === 'landing' || variant === 'content') && isMobile;

  const closeMenu = () => setMenuOpen(false);

  const handleSignup = () => {
    closeMenu();
    router.push('/auth/signup');
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.inner}>
          {/* Logo */}
          {Platform.OS === 'web' ? (
            <Link href="/(guest)" asChild>
              <TouchableOpacity activeOpacity={0.8} onPress={closeMenu}>
                <Logo size="medium" />
              </TouchableOpacity>
            </Link>
          ) : (
            <Logo size="medium" />
          )}

          {/* Desktop nav — landing variant */}
          {variant === 'landing' && !isMobile && (
            <View style={styles.right}>
              <Link href="/(guest)/pricing" asChild>
                <TouchableOpacity>
                  <Text style={styles.navLink} fontType="medium">{t('common.pricing')}</Text>
                </TouchableOpacity>
              </Link>
              <Link href="/(guest)/login" asChild>
                <TouchableOpacity style={styles.ghostBtn}>
                  <Text style={styles.ghostBtnLabel} fontType="medium">{t('common.signIn')}</Text>
                </TouchableOpacity>
              </Link>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup}>
                <Text style={styles.primaryBtnLabel} fontType="medium">{t('guestHeader.getStarted')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Hamburger — landing variant on mobile */}
          {showHamburger && (
            <TouchableOpacity
              style={styles.hamburger}
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="Open menu"
              accessibilityRole="button"
            >
              <Ionicons name="menu-outline" size={26} color={theme.colors.headingText} />
            </TouchableOpacity>
          )}

          {/* Auth variant */}
          {variant === 'auth' && authAction === 'signin' && (
            <View style={styles.right}>
              <Text style={styles.subtleText} fontType="regular">{t('guestHeader.alreadyHaveAccount')}</Text>
              <Link href="/(guest)/login" asChild>
                <TouchableOpacity style={styles.ghostBtn}>
                  <Text style={styles.ghostBtnLabel} fontType="medium">{t('common.signIn')}</Text>
                </TouchableOpacity>
              </Link>
            </View>
          )}

          {variant === 'auth' && authAction === 'signup' && (
            <View style={styles.right}>
              <Text style={styles.subtleText} fontType="regular">{t('guestHeader.noAccountYet')}</Text>
              <TouchableOpacity style={styles.ghostBtn} onPress={handleSignup}>
                <Text style={styles.ghostBtnLabel} fontType="medium">{t('guestHeader.getStarted')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* content variant → logo only */}
        </View>
      </View>

      {/* ── Full-screen mobile menu ─────────────────────────────────────────── */}
      <Modal
        visible={menuOpen}
        animationType="fade"
        transparent={false}
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <SafeAreaView style={styles.menuRoot}>
          {/* Menu header row */}
          <View style={styles.menuHeader}>
            <Logo size="medium" />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={closeMenu}
              accessibilityLabel="Close menu"
              accessibilityRole="button"
            >
              <Ionicons name="close-outline" size={28} color={theme.colors.headingText} />
            </TouchableOpacity>
          </View>

          {/* Menu items */}
          <View style={styles.menuItems}>
            <Link href="/(guest)" asChild>
              <TouchableOpacity style={styles.menuItem} onPress={closeMenu}>
                <Text style={styles.menuItemText} fontType="medium">Home</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.disabledText} />
              </TouchableOpacity>
            </Link>

            <View style={styles.menuDivider} />

            <Link href="/(guest)/pricing" asChild>
              <TouchableOpacity style={styles.menuItem} onPress={closeMenu}>
                <Text style={styles.menuItemText} fontType="medium">{t('common.pricing')}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.disabledText} />
              </TouchableOpacity>
            </Link>

            <View style={styles.menuDivider} />

            <Link href="/(guest)/login" asChild>
              <TouchableOpacity style={styles.menuItem} onPress={closeMenu}>
                <Text style={styles.menuItemText} fontType="medium">{t('common.signIn')}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.disabledText} />
              </TouchableOpacity>
            </Link>
          </View>

          {/* Get Started pinned to bottom */}
          <View style={styles.menuFooter}>
            <TouchableOpacity style={styles.menuPrimaryBtn} onPress={handleSignup}>
              <Text style={styles.menuPrimaryBtnLabel} fontType="medium">{t('guestHeader.getStarted')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── sticky header bar ──
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
  hamburger: {
    padding: theme.spacing(1),
    marginRight: -theme.spacing(1),
  },

  // ── full-screen menu ──
  menuRoot: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    backgroundColor: theme.colors.cardBackground,
  },
  closeBtn: {
    padding: theme.spacing(1),
    marginRight: -theme.spacing(1),
  },
  menuItems: {
    flex: 1,
    paddingTop: theme.spacing(2),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(2.5),
  },
  menuItemText: {
    fontSize: 18,
    color: theme.colors.headingText,
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
    marginHorizontal: theme.spacing(4),
  },
  menuFooter: {
    padding: theme.spacing(4),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  menuPrimaryBtn: {
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuPrimaryBtnLabel: {
    fontSize: 16,
    color: '#fff',
  },
});
