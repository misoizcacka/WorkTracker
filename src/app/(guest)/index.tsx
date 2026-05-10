import React from 'react';
import { View, StyleSheet, Image, Platform, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text } from '../../components/Themed';
import { Link, useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Logo } from '~/components/Logo';
import { Ionicons } from '@expo/vector-icons';

const fallbackImage = require('../../../assets/landing/locationreplay.png');

const FEATURES = [
  { icon: 'calendar-outline' as const, title: 'Daily Scheduling', description: 'Drag-and-drop assignments for each worker. Every crew member knows exactly where to be and when.' },
  { icon: 'location-outline' as const, title: 'Live Location', description: 'See who is on-site, who is in transit, and replay the full day on a map — no phone calls needed.' },
  { icon: 'time-outline' as const, title: 'Automatic Time Tracking', description: 'Work sessions start and end at the job site. Hours are logged without workers touching a timesheet.' },
  { icon: 'document-text-outline' as const, title: 'Payroll & Reports', description: 'Export accurate payroll summaries and project costing reports in seconds, not hours.' },
];

const STATS = [
  { value: 'Real-time', label: 'location updates' },
  { value: 'GDPR', label: 'compliant' },
  { value: 'iOS & Android', label: 'worker app' },
  { value: '10 yr', label: 'record retention' },
];

const STEPS = [
  { n: '1', title: 'Create your company', desc: 'Sign up, set up your company, and invite your first workers by email or invite code.' },
  { n: '2', title: 'Assign the day', desc: 'Each morning, drag workers onto projects and locations. They see their schedule instantly in the app.' },
  { n: '3', title: 'Track in real time', desc: 'Workers check in on arrival. You see live locations, active sessions, and any issues from your dashboard.' },
  { n: '4', title: 'Export and pay', desc: 'At month end, pull a payroll report. Hours are already calculated, broken down by worker and project.' },
];

const MAX_W = 1200;
const BREAKPOINT = 900;

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const lg = width >= BREAKPOINT;

  return (
    <AnimatedScreen>
      <View style={s.container}>
        {/* NAV */}
        <View style={s.nav}>
          <View style={s.navInner}>
            <Link href="/(guest)" asChild>
              <TouchableOpacity activeOpacity={0.7}><Logo /></TouchableOpacity>
            </Link>
            <View style={s.navLinks}>
              <Link href="/(guest)/pricing" asChild>
                <TouchableOpacity><Text style={s.navLink} fontType="medium">Pricing</Text></TouchableOpacity>
              </Link>
              <Link href="/(guest)/login" asChild>
                <TouchableOpacity style={s.navSignIn}>
                  <Text style={s.navSignInText} fontType="medium">Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* HERO */}
          <View style={s.heroSection}>
            <View style={[s.heroInner, { flexDirection: lg ? 'row' : 'column' }]}>
              <View style={{ flex: lg ? 1 : undefined, width: '100%' }}>
                <View style={s.badge}>
                  <Text style={s.badgeText} fontType="bold">FOR CONSTRUCTION & FIELD TEAMS</Text>
                </View>
                <Text style={[s.heroTitle, { fontSize: lg ? 56 : 36, lineHeight: lg ? 64 : 44 }]} fontType="bold">
                  Run your crew.{'\n'}Not your inbox.
                </Text>
                <Text style={s.heroSubtitle} fontType="regular">
                  Koord gives managers a live view of every worker, every job site, and every hour — from one screen.
                </Text>
                <View style={[s.heroCTA, { flexDirection: lg ? 'row' : 'column', alignItems: lg ? 'center' : 'stretch' }]}>
                  <Button title="Get Started" onPress={() => router.push('/auth/signup')} style={s.primaryBtn} />
                  <TouchableOpacity style={s.ghostBtn} onPress={() => router.push('/(guest)/pricing')}>
                    <Text style={s.ghostBtnText} fontType="medium">See Plans</Text>
                    <Ionicons name="arrow-forward" size={16} color={theme.colors.headingText} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[s.heroImageWrap, { flex: lg ? 1 : undefined, width: lg ? undefined : '100%' }]}>
                <Image source={fallbackImage} style={[s.heroImage, { height: lg ? 420 : 220 }]} resizeMode="cover" />
              </View>
            </View>
          </View>

          {/* STATS BAR */}
          <View style={[s.statsBar, { flexDirection: lg ? 'row' : 'row', flexWrap: lg ? 'nowrap' : 'wrap' }]}>
            {STATS.map((s2, i) => (
              <View key={i} style={[
                s.statItem,
                lg ? { flex: 1 } : { width: '48%' },
                lg && i < STATS.length - 1 && s.statDivider,
              ]}>
                <Text style={s.statValue} fontType="bold">{s2.value}</Text>
                <Text style={s.statLabel} fontType="regular">{s2.label}</Text>
              </View>
            ))}
          </View>

          {/* FEATURES */}
          <View style={s.featuresSection}>
            <View style={s.sectionHead}>
              <Text style={s.eyebrow} fontType="bold">WHAT KOORD DOES</Text>
              <Text style={[s.sectionTitle, { fontSize: lg ? 36 : 26, lineHeight: lg ? 44 : 34 }]} fontType="bold">
                Everything a field manager needs.{'\n'}Nothing they don't.
              </Text>
            </View>
            <View style={[s.featuresGrid, { flexDirection: lg ? 'row' : 'column' }]}>
              {FEATURES.map((f, i) => (
                <View key={i} style={[s.featureCard, lg && { flex: 1 }]}>
                  <View style={s.featureIcon}>
                    <Ionicons name={f.icon} size={22} color={theme.colors.primary} />
                  </View>
                  <Text style={s.featureTitle} fontType="bold">{f.title}</Text>
                  <Text style={s.featureDesc} fontType="regular">{f.description}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* HOW IT WORKS */}
          <View style={s.howSection}>
            <View style={s.howInner}>
              <View style={s.sectionHead}>
                <Text style={s.eyebrow} fontType="bold">HOW IT WORKS</Text>
                <Text style={[s.sectionTitle, { fontSize: lg ? 36 : 26, lineHeight: lg ? 44 : 34 }]} fontType="bold">
                  Up and running in minutes.
                </Text>
              </View>
              <View style={s.steps}>
                {STEPS.map((step, i) => (
                  <View key={i} style={s.step}>
                    <View style={s.stepNumber}>
                      <Text style={s.stepNumberText} fontType="bold">{step.n}</Text>
                    </View>
                    <View style={s.stepContent}>
                      <Text style={s.stepTitle} fontType="bold">{step.title}</Text>
                      <Text style={s.stepDesc} fontType="regular">{step.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* CTA BANNER */}
          <View style={s.ctaSection}>
            <View style={[s.ctaBanner, { padding: lg ? theme.spacing(8) : theme.spacing(5) }]}>
              <Text style={[s.ctaTitle, { fontSize: lg ? 36 : 24, lineHeight: lg ? 44 : 32 }]} fontType="bold">
                Stop managing your crew with WhatsApp and spreadsheets.
              </Text>
              <Text style={s.ctaSubtitle} fontType="regular">
                Join construction companies already using Koord to run cleaner, faster field operations.
              </Text>
              <Button title="Create Your Account" onPress={() => router.push('/auth/signup')} style={s.ctaBtn} />
              <Text style={s.ctaNote} fontType="regular">Set up takes less than 5 minutes.</Text>
            </View>
          </View>

          {/* FOOTER */}
          <View style={s.footer}>
            <View style={s.footerInner}>
              <Logo />
              <Text style={s.footerTagline} fontType="regular">Workforce management for field teams.</Text>
            </View>
            <View style={[s.footerBottom, { flexDirection: lg ? 'row' : 'column', alignItems: lg ? 'center' : 'flex-start' }]}>
              <Text style={s.footerCopy} fontType="regular">© {new Date().getFullYear()} Koord. All rights reserved.</Text>
              <View style={s.footerLinks}>
                <Link href="/(guest)/terms" asChild><TouchableOpacity><Text style={s.footerLink} fontType="regular">Terms of Service</Text></TouchableOpacity></Link>
                <Text style={s.footerDot} fontType="regular">·</Text>
                <Link href="/(guest)/privacy" asChild><TouchableOpacity><Text style={s.footerLink} fontType="regular">Privacy Policy</Text></TouchableOpacity></Link>
                <Text style={s.footerDot} fontType="regular">·</Text>
                <Link href="/(guest)/legal-notice" asChild><TouchableOpacity><Text style={s.footerLink} fontType="regular">Legal Notice</Text></TouchableOpacity></Link>
              </View>
            </View>
          </View>

        </ScrollView>
      </View>
    </AnimatedScreen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.pageBackground },
  nav: { backgroundColor: theme.colors.cardBackground, borderBottomWidth: 1, borderBottomColor: theme.colors.borderColor, zIndex: 10 },
  navInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing(4), paddingVertical: theme.spacing(2.5), maxWidth: MAX_W, width: '100%', alignSelf: 'center' },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) },
  navLink: { fontSize: 15, color: theme.colors.bodyText },
  navSignIn: { borderWidth: 1, borderColor: theme.colors.borderColor, paddingHorizontal: theme.spacing(2.5), paddingVertical: theme.spacing(1.25), borderRadius: theme.radius.md },
  navSignInText: { fontSize: 14, color: theme.colors.headingText },
  scroll: { flexGrow: 1 },
  heroSection: { backgroundColor: theme.colors.cardBackground, borderBottomWidth: 1, borderBottomColor: theme.colors.borderColor, paddingVertical: theme.spacing(8), paddingHorizontal: theme.spacing(4) },
  heroInner: { maxWidth: MAX_W, width: '100%', alignSelf: 'center', alignItems: 'center', gap: theme.spacing(6) },
  badge: { alignSelf: 'flex-start', backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing(1.5), paddingVertical: theme.spacing(0.75), marginBottom: theme.spacing(2.5) },
  badgeText: { fontSize: 10, letterSpacing: 1.2, color: theme.colors.primary },
  heroTitle: { color: theme.colors.headingText, marginBottom: theme.spacing(2.5) },
  heroSubtitle: { fontSize: 17, lineHeight: 28, color: theme.colors.bodyText, marginBottom: theme.spacing(4) },
  heroCTA: { gap: theme.spacing(2) },
  primaryBtn: { height: 52, paddingHorizontal: theme.spacing(4), borderRadius: theme.radius.lg },
  ghostBtn: { height: 52, paddingHorizontal: theme.spacing(3), borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderColor, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing(1) },
  ghostBtnText: { fontSize: 15, color: theme.colors.headingText },
  heroImageWrap: { borderRadius: theme.radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.borderColor },
  heroImage: { width: '100%' },
  statsBar: { backgroundColor: theme.colors.headingText, paddingVertical: theme.spacing(3), paddingHorizontal: theme.spacing(2), justifyContent: 'center' },
  statItem: { alignItems: 'center', paddingVertical: theme.spacing(1.5), paddingHorizontal: theme.spacing(1) },
  statDivider: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' },
  statValue: { fontSize: 18, color: '#ffffff', marginBottom: 2 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },
  featuresSection: { paddingVertical: theme.spacing(8), paddingHorizontal: theme.spacing(4), maxWidth: MAX_W, width: '100%', alignSelf: 'center' },
  sectionHead: { alignItems: 'center', marginBottom: theme.spacing(5) },
  eyebrow: { fontSize: 11, letterSpacing: 1.4, color: theme.colors.primary, marginBottom: theme.spacing(1.5) },
  sectionTitle: { color: theme.colors.headingText, textAlign: 'center' },
  featuresGrid: { gap: theme.spacing(2) },
  featureCard: { backgroundColor: theme.colors.cardBackground, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderColor, padding: theme.spacing(3), gap: theme.spacing(1.5) },
  featureIcon: { width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing(0.5) },
  featureTitle: { fontSize: 17, color: theme.colors.headingText },
  featureDesc: { fontSize: 14, lineHeight: 22, color: theme.colors.bodyText },
  howSection: { backgroundColor: theme.colors.cardBackground, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.borderColor, paddingVertical: theme.spacing(8), paddingHorizontal: theme.spacing(4) },
  howInner: { maxWidth: MAX_W, width: '100%', alignSelf: 'center' },
  steps: { gap: theme.spacing(4), maxWidth: 680, alignSelf: 'center', width: '100%' },
  step: { flexDirection: 'row', gap: theme.spacing(3), alignItems: 'flex-start' },
  stepNumber: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.headingText, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  stepNumberText: { color: '#ffffff', fontSize: 16 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 17, color: theme.colors.headingText, marginBottom: theme.spacing(0.75) },
  stepDesc: { fontSize: 15, lineHeight: 24, color: theme.colors.bodyText },
  ctaSection: { paddingVertical: theme.spacing(8), paddingHorizontal: theme.spacing(4), maxWidth: MAX_W, width: '100%', alignSelf: 'center' },
  ctaBanner: { backgroundColor: theme.colors.headingText, borderRadius: theme.radius.xl, alignItems: 'center', gap: theme.spacing(2) },
  ctaTitle: { color: '#ffffff', textAlign: 'center', maxWidth: 640 },
  ctaSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', maxWidth: 520, lineHeight: 24 },
  ctaBtn: { backgroundColor: '#ffffff', height: 52, paddingHorizontal: theme.spacing(5), borderRadius: theme.radius.lg, marginTop: theme.spacing(1) },
  ctaNote: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  footer: { borderTopWidth: 1, borderTopColor: theme.colors.borderColor, paddingVertical: theme.spacing(5), paddingHorizontal: theme.spacing(4) },
  footerInner: { maxWidth: MAX_W, width: '100%', alignSelf: 'center', alignItems: 'flex-start', gap: theme.spacing(1), marginBottom: theme.spacing(4) },
  footerTagline: { fontSize: 13, color: theme.colors.disabledText },
  footerBottom: { maxWidth: MAX_W, width: '100%', alignSelf: 'center', justifyContent: 'space-between', gap: theme.spacing(1.5) },
  footerCopy: { fontSize: 12, color: theme.colors.disabledText },
  footerLinks: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing(1.5) },
  footerLink: { fontSize: 12, color: theme.colors.primary },
  footerDot: { fontSize: 12, color: theme.colors.disabledText },
});
