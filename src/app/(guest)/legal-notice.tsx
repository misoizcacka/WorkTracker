import React from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Themed';
import { theme } from '../../theme';
import { Link } from 'expo-router';
import { Logo } from '~/components/Logo';

export default function Impressum() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Link href="/(guest)" asChild>
          <TouchableOpacity activeOpacity={0.7}>
            <Logo />
          </TouchableOpacity>
        </Link>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle} fontType="bold">Legal Notice</Text>
        <Text style={styles.subtitle} fontType="regular">Information pursuant to §5 TMG (German Telemedia Act)</Text>

        <View style={styles.section}>
          <Text style={styles.label} fontType="bold">Responsible</Text>
          <Text style={styles.value} fontType="regular">Milos Bugaric</Text>
          <Text style={styles.value} fontType="regular">Scharnweberstrasse 23</Text>
          <Text style={styles.value} fontType="regular">12459 Berlin</Text>
          <Text style={styles.value} fontType="regular">Germany</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label} fontType="bold">Contact</Text>
          <Text style={styles.value} fontType="regular">Phone: +49 176 41700099</Text>
          <Text style={styles.value} fontType="regular">Email: info@koord.app</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label} fontType="bold">Disclaimer</Text>
          <Text style={styles.body} fontType="regular">
            The contents of this website have been prepared with the utmost care. However, we cannot guarantee the accuracy, completeness, or timeliness of the information provided.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText} fontType="regular">© {new Date().getFullYear()} Koord. All rights reserved.</Text>
          <Link href="/(guest)" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink} fontType="regular">← Back to home</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  header: {
    padding: theme.spacing(4),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    backgroundColor: theme.colors.cardBackground,
  },
  content: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    padding: theme.spacing(6),
    paddingBottom: theme.spacing(12),
  },
  pageTitle: {
    fontSize: 36,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.disabledText,
    marginBottom: theme.spacing(5),
  },
  section: {
    marginBottom: theme.spacing(4),
    gap: theme.spacing(0.5),
  },
  label: {
    fontSize: 13,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 15,
    color: theme.colors.bodyText,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    color: theme.colors.bodyText,
    lineHeight: 22,
  },
  footer: {
    marginTop: theme.spacing(10),
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.disabledText,
  },
  footerLink: {
    fontSize: 14,
    color: theme.colors.primary,
  },
});
