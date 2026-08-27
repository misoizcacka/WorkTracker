import React from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Themed';
import { theme } from '../../theme';
import { Link } from 'expo-router';
import { GuestHeader } from '~/components/GuestHeader';
import { GuestFooter } from '~/components/GuestFooter';

const LAST_UPDATED = '20 August 2026';
const CONTACT_EMAIL = 'info@koordinate.app';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} fontType="bold">{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph} fontType="regular">{children}</Text>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.bullet} fontType="regular">•</Text>
      <Text style={styles.listText} fontType="regular">{children}</Text>
    </View>
  );
}

export default function PrivacyPolicy() {
  return (
    <View style={styles.container}>
      <GuestHeader variant="content" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle} fontType="bold">Privacy Policy</Text>
        <Text style={styles.lastUpdated} fontType="regular">Last updated: {LAST_UPDATED}</Text>

        <P>
          This Privacy Policy explains how Koordinate ("we", "us", "our") collects, uses, and protects personal data when you use our workforce management platform ("the Service") at koordinate.app. We are committed to protecting your privacy and complying with the General Data Protection Regulation (GDPR) and the German Federal Data Protection Act (BDSG).
        </P>

        <Section title="1. Data Controller">
          <P>
            Koordinate (operated by Milos Bugaric, Einzelunternehmer) is the data controller for personal data of company owners and managers who register for the Service.{'\n\n'}
            For personal data of workers processed on behalf of a company using Koordinate, the company is the data controller and Koordinate acts as a data processor under a Data Processing Agreement (DPA). Our DPA is available at koordinate.app/dpa.
          </P>
          <P>Contact: {CONTACT_EMAIL}</P>
        </Section>

        <Section title="2. What Data We Collect">
          <P>We collect the following categories of personal data:</P>

          <Text style={styles.subheading} fontType="bold">Account data (owners and managers)</Text>
          <Li>Full name</Li>
          <Li>Email address</Li>
          <Li>Password (hashed, never stored in plain text)</Li>
          <Li>Company name and country</Li>
          <Li>Stripe customer and subscription identifiers</Li>

          <Text style={styles.subheading} fontType="bold">Employee data (workers and managers)</Text>
          <Li>Full name</Li>
          <Li>Email address</Li>
          <Li>Phone number (optional)</Li>
          <Li>Role and employment status within the company</Li>
          <Li>Profile avatar (optional)</Li>

          <Text style={styles.subheading} fontType="bold">Work and location data (workers)</Text>
          <Li>Work session start and end times</Li>
          <Li>Project and location assignments</Li>
          <Li>GPS location events collected in the background during active work sessions</Li>
          <Li>Device identifiers used for secure check-in authentication</Li>
        </Section>

        <Section title="3. Why We Collect It and Our Legal Basis">
          <P>
            <Text fontType="bold">Performance of a contract (GDPR Art. 6(1)(b)):{'\n'}</Text>
            Account data is processed to provide the Service you signed up for.
          </P>
          <P>
            <Text fontType="bold">Legitimate interests (GDPR Art. 6(1)(f)):{'\n'}</Text>
            Work session and location data is processed on behalf of the employing company for workforce management, payroll preparation, and project costing. The company is responsible for ensuring it has a lawful basis under applicable employment law (in Germany: §26 BDSG or a works agreement under §87 BetrVG) to conduct location monitoring of its workers.
          </P>
          <P>
            <Text fontType="bold">Legal obligation (GDPR Art. 6(1)(c)):{'\n'}</Text>
            Work hour records are retained to comply with accounting obligations under German law (§257 HGB, §147 AO).
          </P>
        </Section>

        <Section title="4. Background Location Tracking">
          <P>
            The Koordinate mobile app collects GPS location data in the background when a worker is checked in to a work session. This means location data may be collected even when the app is not actively open on screen.
          </P>
          <P>
            Location tracking only occurs during active work sessions. Workers are informed of this tracking through the app before the device location permission is requested. Location data is visible to the worker's employer (managers and owners of their company) and is used solely for workforce management purposes.
          </P>
          <P>
            Employers deploying Koordinate to their workers are responsible for fulfilling their information obligations under GDPR Art. 13 towards their employees, including disclosure of the location monitoring. A model worker notice is available in our DPA at koordinate.app/dpa.
          </P>
          <P>Raw GPS location data is automatically deleted after 90 days.</P>
        </Section>

        <Section title="5. How Long We Keep Your Data">
          <Li>GPS location events: deleted automatically after 90 days</Li>
          <Li>Work session records (hours, payroll): retained for up to 10 years to comply with German accounting law (§257 HGB, §147 AO)</Li>
          <Li>Employee personal data: deleted when the company account is closed or upon a valid erasure request</Li>
          <Li>Expired invitations: deleted 30 days after expiry</Li>
          <Li>Account data: deleted upon subscription cancellation</Li>
        </Section>

        <Section title="6. Who We Share Data With">
          <P>We use the following third-party sub-processors to operate the Service:</P>
          <Li>Supabase (database and authentication) — data stored in the EU (Frankfurt)</Li>
          <Li>Stripe (payment processing) — governed by Stripe's own GDPR commitments</Li>
          <Li>Google Maps / MapLibre (map rendering — GPS coordinates are not forwarded to Google for worker tracking purposes)</Li>
          <Li>Vercel (web hosting) — EU data processing available</Li>
          <P>We do not sell personal data to third parties. The full list of sub-processors is included in our DPA at koordinate.app/dpa.</P>
        </Section>

        <Section title="7. Your Rights Under GDPR">
          <P>If you are located in the EEA, you have the following rights:</P>
          <Li>Right of access (Art. 15) — request a copy of your personal data</Li>
          <Li>Right to rectification (Art. 16) — correct inaccurate data</Li>
          <Li>Right to erasure (Art. 17) — request deletion of your data ("right to be forgotten")</Li>
          <Li>Right to data portability (Art. 20) — receive your data in a machine-readable format</Li>
          <Li>Right to object (Art. 21) — object to processing based on legitimate interests</Li>
          <Li>Right to restriction (Art. 18) — request that we limit how we use your data</Li>
          <P>
            To exercise any of these rights, contact us at {CONTACT_EMAIL}. We will respond within 30 days.
          </P>
          <P>
            You also have the right to lodge a complaint with your national supervisory authority (Art. 77 GDPR):{'\n'}
            • Germany: Bundesbeauftragte für den Datenschutz (BfDI) — https://www.bfdi.bund.de{'\n'}
            • Berlin state authority: Berliner Beauftragte für Datenschutz und Informationsfreiheit — https://www.datenschutz-berlin.de
          </P>
        </Section>

        <Section title="8. Cookies and Web Tracking">
          <P>
            The Koordinate web app uses only technically necessary cookies required for authentication and session management. We do not use advertising or analytics cookies. No cookie consent banner is required for strictly necessary cookies under the ePrivacy Directive and §25 TDDDG (formerly TTDSG).
          </P>
        </Section>

        <Section title="9. Data Security">
          <P>
            We implement appropriate technical and organisational measures (TOMs) to protect personal data, including encrypted data transmission (TLS 1.2+), row-level security (RLS) on all database tables, hashed passwords (bcrypt via Supabase Auth), and device-based authentication tokens for worker check-ins.
          </P>
        </Section>

        <Section title="10. International Transfers">
          <P>
            All personal data is stored and processed within the European Union. We do not transfer personal data to countries outside the EEA.
          </P>
        </Section>

        <Section title="11. Data Processing Agreement">
          <P>
            Companies using Koordinate to process their employees' personal data act as data controllers. Koordinate acts as a data processor under GDPR Art. 28. Our standard Data Processing Agreement, which is incorporated into the Terms of Service, is available at{' '}
            <Link href="/(guest)/dpa" asChild>
              <Text style={styles.inlineLink} fontType="regular">koordinate.app/dpa</Text>
            </Link>
            .
          </P>
        </Section>

        <Section title="12. Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify you of material changes by email or via an in-app notice at least 14 days before the changes take effect.
          </P>
        </Section>

        <Section title="13. Contact">
          <P>
            For any privacy-related questions or to exercise your rights:{'\n'}{CONTACT_EMAIL}{'\n'}koordinate.app
          </P>
        </Section>

        <View style={styles.footer}>
          <Link href="/(guest)" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink} fontType="regular">← Back to home</Text>
            </TouchableOpacity>
          </Link>
        </View>
        <GuestFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    padding: theme.spacing(6),
    paddingBottom: theme.spacing(12),
  },
  pageTitle: {
    fontSize: 36,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  lastUpdated: {
    fontSize: 13,
    color: theme.colors.disabledText,
    marginBottom: theme.spacing(5),
  },
  section: {
    marginTop: theme.spacing(5),
  },
  sectionTitle: {
    fontSize: 18,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  subheading: {
    fontSize: 14,
    color: theme.colors.headingText,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  paragraph: {
    fontSize: 15,
    color: theme.colors.bodyText,
    lineHeight: 24,
    marginBottom: theme.spacing(2),
  },
  listItem: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
    paddingLeft: theme.spacing(1),
  },
  bullet: {
    fontSize: 15,
    color: theme.colors.bodyText,
    lineHeight: 24,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.bodyText,
    lineHeight: 24,
  },
  inlineLink: {
    fontSize: 15,
    color: theme.colors.primary,
    lineHeight: 24,
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
