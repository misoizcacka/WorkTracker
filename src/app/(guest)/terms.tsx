import React from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../../components/Themed';
import { theme } from '../../theme';
import { Link } from 'expo-router';
import { Logo } from '~/components/Logo';

const LAST_UPDATED = '10 May 2026';
const CONTACT_EMAIL = 'info@koord.app';

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

export default function TermsOfService() {
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
        <Text style={styles.pageTitle} fontType="bold">Terms of Service</Text>
        <Text style={styles.lastUpdated} fontType="regular">Last updated: {LAST_UPDATED}</Text>

        <P>
          Please read these Terms of Service ("Terms") carefully before using Koord ("the Service"). By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
        </P>

        <Section title="1. Who We Are">
          <P>
            Koord is a workforce management platform that enables companies ("Customers") to manage employee work hours, assignments, and location tracking. The Service is operated by Koord ("we", "us", "our").
          </P>
        </Section>

        <Section title="2. Eligibility">
          <P>You must be at least 18 years old and have the legal authority to enter into these Terms on behalf of yourself or your organisation. By registering, you confirm this.</P>
        </Section>

        <Section title="3. Your Account">
          <Li>You are responsible for maintaining the confidentiality of your login credentials.</Li>
          <Li>You must provide accurate and complete information when registering.</Li>
          <Li>You are responsible for all activity that occurs under your account.</Li>
          <Li>Notify us immediately at {CONTACT_EMAIL} if you suspect unauthorised access.</Li>
        </Section>

        <Section title="4. Acceptable Use">
          <P>You agree not to:</P>
          <Li>Use the Service for any unlawful purpose or in violation of applicable law.</Li>
          <Li>Track employees without their knowledge or without a lawful basis under applicable employment and data protection law.</Li>
          <Li>Attempt to reverse-engineer, hack, or disrupt the Service.</Li>
          <Li>Resell or sublicense access to the Service without our written consent.</Li>
        </Section>

        <Section title="5. Employee Data and GDPR">
          <P>
            If you use Koord to process personal data of employees located in the European Economic Area (EEA), you act as the data controller and we act as the data processor under the General Data Protection Regulation (GDPR).
          </P>
          <P>
            You are responsible for ensuring you have a lawful basis to collect and process employee data, including location data, and that employees have been properly informed in accordance with GDPR Articles 13 and 14.
          </P>
          <P>
            Our processing of personal data on your behalf is governed by our Data Processing Agreement (DPA), which forms part of these Terms.
          </P>
        </Section>

        <Section title="6. Location Tracking">
          <P>
            Koord collects background GPS location data from workers who have the mobile app installed and are checked in to a work session. By deploying the Koord app to your workers, you confirm that:
          </P>
          <Li>Workers have been informed that their location is tracked during work sessions.</Li>
          <Li>You have a lawful basis under applicable employment law to conduct such monitoring.</Li>
          <Li>Location data is used solely for workforce management purposes.</Li>
        </Section>

        <Section title="7. Subscription and Payment">
          <Li>Access to the Service requires a paid subscription, billed monthly via Stripe.</Li>
          <Li>Prices are per active worker seat per month, as shown on our pricing page.</Li>
          <Li>Subscriptions renew automatically unless cancelled before the renewal date.</Li>
          <Li>We reserve the right to change pricing with 30 days' notice.</Li>
          <Li>No refunds are issued for partial months.</Li>
        </Section>

        <Section title="8. Data Retention and Deletion">
          <P>
            Upon cancellation of your subscription, your company data will be deleted. Raw GPS location data is automatically deleted after 90 days. Work session records required for payroll compliance are retained for up to 10 years in accordance with German (§257 HGB) and Swedish (Bokföringslagen) accounting law.
          </P>
        </Section>

        <Section title="9. Intellectual Property">
          <P>
            All rights in the Service, including software, design, and content, are owned by or licensed to Koord. These Terms do not grant you any rights to our intellectual property beyond the limited right to use the Service as described herein.
          </P>
        </Section>

        <Section title="10. Disclaimer of Warranties">
          <P>
            The Service is provided "as is" without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components.
          </P>
        </Section>

        <Section title="11. Limitation of Liability">
          <P>
            To the maximum extent permitted by law, Koord shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
          </P>
        </Section>

        <Section title="12. Termination">
          <P>
            We may suspend or terminate your access to the Service at any time if you breach these Terms. You may cancel your subscription at any time through the account settings.
          </P>
        </Section>

        <Section title="13. Governing Law">
          <P>
            These Terms are governed by and construed in accordance with the laws of the European Union and the jurisdiction in which Koord is incorporated. Any disputes shall be subject to the exclusive jurisdiction of the competent courts in that jurisdiction.
          </P>
        </Section>

        <Section title="14. Changes to These Terms">
          <P>
            We may update these Terms from time to time. We will notify you of material changes by email or via an in-app notice at least 14 days before the changes take effect. Continued use of the Service after that date constitutes acceptance of the updated Terms.
          </P>
        </Section>

        <Section title="15. Contact">
          <P>
            For questions about these Terms, contact us at:{'\n'}{CONTACT_EMAIL}
          </P>
        </Section>

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
