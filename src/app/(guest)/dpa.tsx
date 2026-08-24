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

function NumLi({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.bullet} fontType="regular">{n}</Text>
      <Text style={styles.listText} fontType="regular">{children}</Text>
    </View>
  );
}

export default function DataProcessingAgreement() {
  return (
    <View style={styles.container}>
      <GuestHeader variant="content" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle} fontType="bold">Data Processing Agreement</Text>
        <Text style={styles.subtitle} fontType="regular">
          Pursuant to Art. 28 GDPR — between Koordinate (Processor) and the Customer (Controller)
        </Text>
        <Text style={styles.lastUpdated} fontType="regular">Last updated: {LAST_UPDATED}</Text>

        <P>
          This Data Processing Agreement ("DPA") is entered into between the company or individual registering for the Koordinate service ("Controller" or "Customer") and Milos Bugaric, Einzelunternehmer, trading as Koordinate, Scharnweberstrasse 23, 12459 Berlin, Germany ("Processor"). This DPA forms an integral part of the Koordinate Terms of Service and is deemed accepted by the Customer upon account creation.
        </P>

        <Section title="1. Subject Matter and Duration">
          <P>
            The Processor provides a cloud-based workforce management platform ("the Service") to the Controller. In doing so, the Processor processes personal data of the Controller's employees and managers on behalf of the Controller.
          </P>
          <P>
            This DPA is effective for the duration of the Service agreement and terminates automatically upon deletion of the Controller's account or expiry of the Terms of Service.
          </P>
        </Section>

        <Section title="2. Nature and Purpose of Processing">
          <P>The Processor processes personal data for the following purposes on behalf of the Controller:</P>
          <Li>Authentication and account management of the Controller's employees and managers</Li>
          <Li>Recording and storing work session start and end times</Li>
          <Li>Collecting and storing GPS location events from workers during active work sessions</Li>
          <Li>Assignment of workers to projects and job sites</Li>
          <Li>Generation of payroll and project costing reports</Li>
          <Li>Sending invite emails to workers on behalf of the Controller</Li>
          <Li>Storing profile data (name, email, avatar) for worker accounts</Li>
        </Section>

        <Section title="3. Categories of Data Subjects">
          <P>The personal data processed relates to the following categories of data subjects:</P>
          <Li>The Controller's employees and field workers using the Koordinate mobile app</Li>
          <Li>The Controller's managers and administrators using the Koordinate web platform</Li>
          <Li>The Controller's account owner(s)</Li>
        </Section>

        <Section title="4. Categories of Personal Data">
          <P>The following categories of personal data are processed:</P>
          <Li>Identity data: full name, email address, phone number (optional), profile avatar (optional)</Li>
          <Li>Authentication data: hashed passwords, device identifiers, session tokens</Li>
          <Li>Work data: work session timestamps, project and site assignments, correction records</Li>
          <Li>Location data: GPS coordinates collected in the background during active work sessions</Li>
          <Li>Billing data (Controller only): Stripe customer ID, subscription identifiers — not shared with workers</Li>
        </Section>

        <Section title="5. Obligations of the Processor (Koordinate)">
          <P>The Processor undertakes to:</P>
          <NumLi n="5.1">Process personal data only on documented instructions from the Controller, unless required to do so by EU or national law.</NumLi>
          <NumLi n="5.2">Ensure that persons authorised to process personal data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality.</NumLi>
          <NumLi n="5.3">Implement all technical and organisational measures required under Art. 32 GDPR (see Section 9).</NumLi>
          <NumLi n="5.4">Respect the conditions for engaging sub-processors as set out in Section 8.</NumLi>
          <NumLi n="5.5">Assist the Controller in responding to requests from data subjects exercising their rights under GDPR (Arts. 15–22), taking into account the nature of processing.</NumLi>
          <NumLi n="5.6">Assist the Controller in ensuring compliance with obligations under Arts. 32–36 GDPR (security, breach notification, DPIAs), taking into account the nature of processing and information available to the Processor.</NumLi>
          <NumLi n="5.7">At the choice of the Controller, delete or return all personal data after the end of the service provision, and delete existing copies unless EU or national law requires storage.</NumLi>
          <NumLi n="5.8">Make available to the Controller all information necessary to demonstrate compliance with the obligations laid down in Art. 28 GDPR.</NumLi>
        </Section>

        <Section title="6. Obligations of the Controller (Customer)">
          <P>The Controller undertakes to:</P>
          <NumLi n="6.1">Ensure a lawful basis exists for processing employee location and work data under GDPR Art. 6 and, in Germany, §26 BDSG or a works agreement (Betriebsvereinbarung) pursuant to §87 BetrVG.</NumLi>
          <NumLi n="6.2">Inform workers about the use of Koordinate and the nature of location monitoring before deploying the app (GDPR Art. 13 obligation). A model worker notice is provided in Annex A of this DPA.</NumLi>
          <NumLi n="6.3">Only instruct the Processor to process data in ways that comply with applicable law.</NumLi>
          <NumLi n="6.4">Promptly notify the Processor if an instruction would, in the Controller's opinion, violate applicable law.</NumLi>
        </Section>

        <Section title="7. Data Subject Rights">
          <P>
            Where a data subject submits a rights request (access, erasure, restriction, portability, objection) directly to Koordinate, we will forward it to the Controller without undue delay. The Controller remains responsible for responding to such requests.
          </P>
          <P>
            For data subjects whose data is processed solely as part of the Controller's account (i.e., workers), rights requests should in the first instance be directed to the Controller (the employing company). Koordinate will provide reasonable technical assistance to the Controller in fulfilling such requests.
          </P>
          <P>
            Data subjects may also contact Koordinate directly at {CONTACT_EMAIL} if they are unable to reach their employer.
          </P>
        </Section>

        <Section title="8. Sub-Processors">
          <P>
            The Controller hereby grants general authorisation for the Processor to engage sub-processors. The Processor will inform the Controller of any changes (addition or replacement of sub-processors) with reasonable notice, giving the Controller the opportunity to object.
          </P>
          <P>The following sub-processors are currently engaged:</P>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableCellHeader, { flex: 1.2 }]} fontType="bold">Sub-Processor</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader, { flex: 1.5 }]} fontType="bold">Purpose</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader, { flex: 1 }]} fontType="bold">Location</Text>
            </View>
            {[
              { name: 'Supabase, Inc.', purpose: 'Database, authentication, storage', location: 'EU (Frankfurt)' },
              { name: 'Stripe, Inc.', purpose: 'Payment processing (Controller billing only)', location: 'EU data residency' },
              { name: 'Vercel, Inc.', purpose: 'Web application hosting', location: 'EU regions available' },
              { name: 'Google LLC / MapLibre', purpose: 'Map tile rendering (no worker GPS forwarded)', location: 'EU CDN' },
              { name: 'Resend / Email provider', purpose: 'Transactional invite emails', location: 'EU' },
            ].map((row, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 1.2 }]} fontType="medium">{row.name}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]} fontType="regular">{row.purpose}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]} fontType="regular">{row.location}</Text>
              </View>
            ))}
          </View>

          <P>
            All sub-processors are bound by data processing agreements that impose obligations equivalent to those in this DPA. No personal data is transferred outside the EEA.
          </P>
        </Section>

        <Section title="9. Technical and Organisational Measures (Art. 32 GDPR)">
          <P>The Processor implements the following measures to ensure an appropriate level of security:</P>

          <Text style={styles.subheading} fontType="bold">Confidentiality</Text>
          <Li>All data transmissions use TLS 1.2 or higher encryption</Li>
          <Li>Passwords are hashed using bcrypt (via Supabase Auth); plaintext passwords are never stored</Li>
          <Li>Row-level security (RLS) policies ensure each company can only access its own data</Li>
          <Li>Worker check-in uses device-bound authentication tokens to prevent impersonation</Li>
          <Li>Database access is restricted to authorised service accounts only</Li>

          <Text style={styles.subheading} fontType="bold">Integrity</Text>
          <Li>Database-level foreign key constraints and unique constraints prevent data corruption</Li>
          <Li>All API endpoints are authenticated; unauthenticated requests are rejected</Li>

          <Text style={styles.subheading} fontType="bold">Availability</Text>
          <Li>The Service is hosted on Supabase and Vercel infrastructure with high availability SLAs</Li>
          <Li>Regular automated database backups are performed by the infrastructure provider</Li>

          <Text style={styles.subheading} fontType="bold">Data minimisation</Text>
          <Li>Location data is only collected during active work sessions (not 24/7)</Li>
          <Li>Raw GPS data is automatically deleted after 90 days</Li>
          <Li>Workers can only be added to a company via explicit invite</Li>
        </Section>

        <Section title="10. Personal Data Breaches">
          <P>
            In the event of a personal data breach as defined in GDPR Art. 4(12), the Processor will notify the Controller without undue delay and, where feasible, no later than 72 hours after becoming aware of the breach. The notification will include:
          </P>
          <Li>A description of the nature of the breach, including categories and approximate number of data subjects and records concerned</Li>
          <Li>The name and contact details of the data protection contact point</Li>
          <Li>A description of the likely consequences of the breach</Li>
          <Li>A description of the measures taken or proposed to address the breach</Li>
          <P>
            The Controller remains responsible for notifying the competent supervisory authority (e.g., BfDI or the relevant Landesbehörde in Germany) and affected data subjects where required by GDPR Arts. 33–34.
          </P>
        </Section>

        <Section title="11. Deletion and Return of Data">
          <P>
            Upon termination of the Service agreement or at the Controller's request:
          </P>
          <Li>All worker and manager personal data (names, emails, avatars) will be deleted from active databases</Li>
          <Li>GPS location events are deleted after 90 days as standard</Li>
          <Li>Work session records required for statutory retention (§257 HGB, §147 AO) will be retained for up to 10 years in anonymised or pseudonymised form where possible, or deleted upon expiry of the retention period</Li>
          <P>The Controller may request confirmation of deletion by contacting {CONTACT_EMAIL}.</P>
        </Section>

        <Section title="12. Audit Rights">
          <P>
            The Controller has the right to verify compliance with this DPA. The Processor will make available all information reasonably necessary to demonstrate compliance. Where an on-site audit is requested, the Controller must provide at least 30 days' notice and bear any associated costs. The Processor may satisfy audit requests through provision of relevant certifications or third-party audit reports where available.
          </P>
        </Section>

        <Section title="13. Governing Law">
          <P>
            This DPA is governed by the laws of the Federal Republic of Germany. Any disputes arising from this DPA shall be subject to the jurisdiction of the courts of Berlin, Germany.
          </P>
        </Section>

        <Section title="Annex A — Model Worker Notice">
          <P>
            The following is a model information notice that Controllers (employers) should provide to workers before deploying the Koordinate app, in fulfilment of GDPR Art. 13 obligations. You may adapt this text to your company's letterhead.
          </P>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle} fontType="bold">INFORMATION NOTICE — WORKFORCE MANAGEMENT APP (KOORDINATE)</Text>
            <Text style={styles.noticeText} fontType="regular">
              {'\n'}Dear [Worker Name],{'\n\n'}
              As part of our workforce management, our company uses the Koordinate app (koordinate.app) to manage work assignments, track working hours, and view the location of workers during work sessions.{'\n\n'}
              <Text fontType="bold">What data is collected:{'\n'}</Text>
              • Your name, email address, and profile information{'\n'}
              • Work session start and end times{'\n'}
              • Your GPS location during active work sessions (background location tracking){'\n\n'}
              <Text fontType="bold">Purpose:{'\n'}</Text>
              This data is used for workforce management, payroll calculation, and project costing. Your location is only collected when you are checked in to a work session.{'\n\n'}
              <Text fontType="bold">Legal basis:{'\n'}</Text>
              Processing is based on our legitimate interest in managing workforce operations (GDPR Art. 6(1)(f)) and compliance with employment and accounting obligations.{'\n\n'}
              <Text fontType="bold">Data processor:{'\n'}</Text>
              Koordinate (Milos Bugaric, Einzelunternehmer), Scharnweberstrasse 23, 12459 Berlin — info@koordinate.app{'\n\n'}
              <Text fontType="bold">Retention:{'\n'}</Text>
              GPS location data is deleted after 90 days. Work hour records are retained up to 10 years for accounting compliance.{'\n\n'}
              <Text fontType="bold">Your rights:{'\n'}</Text>
              You have the right to access, correct, or request deletion of your personal data. Contact [your company's HR contact] or info@koordinate.app. You may also complain to the data protection authority in your country.{'\n\n'}
              [Company name]{'\n'}
              [Date]
            </Text>
          </View>
        </Section>

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
    maxWidth: 760,
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
    fontSize: 14,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(1),
    lineHeight: 22,
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
    minWidth: 28,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.bodyText,
    lineHeight: 24,
  },
  // Table styles
  table: {
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing(3),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryMuted,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  tableRowAlt: {
    backgroundColor: theme.colors.pageBackground,
  },
  tableCell: {
    padding: theme.spacing(1.5),
    fontSize: 13,
    color: theme.colors.bodyText,
    lineHeight: 20,
  },
  tableCellHeader: {
    fontSize: 13,
    color: theme.colors.headingText,
  },
  // Notice box
  noticeBox: {
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.md,
    padding: theme.spacing(3),
    backgroundColor: theme.colors.pageBackground,
    marginTop: theme.spacing(2),
  },
  noticeTitle: {
    fontSize: 13,
    color: theme.colors.headingText,
    letterSpacing: 0.5,
    marginBottom: theme.spacing(1),
  },
  noticeText: {
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
