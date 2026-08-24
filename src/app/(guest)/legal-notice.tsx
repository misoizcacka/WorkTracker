import React from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Themed';
import { theme } from '../../theme';
import { Link } from 'expo-router';
import { GuestHeader } from '~/components/GuestHeader';
import { GuestFooter } from '~/components/GuestFooter';

export default function Impressum() {
  return (
    <View style={styles.container}>
      <GuestHeader variant="content" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle} fontType="bold">Legal Notice</Text>
        <Text style={styles.subtitle} fontType="regular">Impressum – Information pursuant to §5 TMG (Telemedia Act) and §55 RStV</Text>

        {/* Provider */}
        <View style={styles.section}>
          <Text style={styles.label} fontType="bold">Service Provider</Text>
          <Text style={styles.value} fontType="regular">Milos Bugaric</Text>
          <Text style={styles.value} fontType="regular">Operating as: Einzelunternehmer (sole trader)</Text>
          <Text style={styles.value} fontType="regular">Trading name: Koordinate</Text>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.label} fontType="bold">Registered Address</Text>
          <Text style={styles.value} fontType="regular">Scharnweberstrasse 23</Text>
          <Text style={styles.value} fontType="regular">12459 Berlin</Text>
          <Text style={styles.value} fontType="regular">Germany</Text>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.label} fontType="bold">Contact</Text>
          <Text style={styles.value} fontType="regular">Phone: +49 176 41700099</Text>
          <Text style={styles.value} fontType="regular">Email: info@koordinate.app</Text>
          <Text style={styles.value} fontType="regular">Website: https://koordinate.app</Text>
        </View>

        {/* Tax */}
        <View style={styles.section}>
          <Text style={styles.label} fontType="bold">Tax Information</Text>
          <Text style={styles.value} fontType="regular">
            VAT applies to our services in accordance with §§ 1 ff. UStG.
          </Text>
        </View>

        {/* Data protection officer */}
        <View style={styles.section}>
          <Text style={styles.label} fontType="bold">Responsible for Content (§55 Abs. 2 RStV)</Text>
          <Text style={styles.value} fontType="regular">Milos Bugaric</Text>
          <Text style={styles.value} fontType="regular">Scharnweberstrasse 23, 12459 Berlin, Germany</Text>
        </View>

        {/* Dispute resolution */}
        <View style={styles.section}>
          <Text style={styles.label} fontType="bold">EU Online Dispute Resolution</Text>
          <Text style={styles.body} fontType="regular">
            The European Commission provides an Online Dispute Resolution (ODR) platform: https://ec.europa.eu/consumers/odr{'\n\n'}
            We are not obliged to participate in dispute resolution proceedings before a consumer arbitration board and do not voluntarily do so.
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.section}>
          <Text style={styles.label} fontType="bold">Disclaimer</Text>
          <Text style={styles.body} fontType="regular">
            The contents of this website have been prepared with the utmost care. However, we cannot guarantee the accuracy, completeness, or timeliness of the information provided. As a service provider, we are responsible for our own content on these pages in accordance with §7 Abs. 1 TMG. However, according to §§8–10 TMG, we are not obliged to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.
          </Text>
        </View>

        <View style={styles.footer}>
          <Link href="/(guest)" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink} fontType="regular">← Back to home</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
      <GuestFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
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
  footerLink: {
    fontSize: 14,
    color: theme.colors.primary,
  },
});
