import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Link } from 'expo-router';
import { Text } from './Themed';
import { Logo } from './Logo';
import { theme } from '../theme';

const MAX_W = 1160;

const FOOTER_LINKS = [
  { label: 'Pricing', href: '/(guest)/pricing' },
  { label: 'Terms', href: '/(guest)/terms' },
  { label: 'Privacy', href: '/(guest)/privacy' },
  { label: 'DPA', href: '/(guest)/dpa' },
  { label: 'Legal Notice', href: '/(guest)/legal-notice' },
] as const;

export function GuestFooter() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.inner}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <Logo size="medium" />
            <Text style={styles.tagline} fontType="regular">Workforce management for field teams.</Text>
          </View>
          <View style={styles.links}>
            {FOOTER_LINKS.map(item => (
              <Link key={item.label} href={item.href as any} asChild>
                <TouchableOpacity>
                  <Text style={styles.link} fontType="regular">{item.label}</Text>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.copy} fontType="regular">
            © {new Date().getFullYear()} Koordinate. All rights reserved.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    paddingHorizontal: theme.spacing(4),
  },
  inner: {
    paddingVertical: theme.spacing(5),
    maxWidth: MAX_W,
    width: '100%',
    alignSelf: 'center',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: theme.spacing(3),
    marginBottom: theme.spacing(4),
  },
  brand: {
    gap: theme.spacing(1),
  },
  tagline: {
    fontSize: 13,
    color: theme.colors.disabledText,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
  },
  link: {
    fontSize: 13,
    color: theme.colors.bodyText,
  },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    paddingTop: theme.spacing(3),
  },
  copy: {
    fontSize: 12,
    color: theme.colors.disabledText,
  },
});
