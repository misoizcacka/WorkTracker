import React, { useState } from 'react';
import { View, StyleSheet, Platform, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text } from '../../components/Themed';
import { Link, useRouter } from 'expo-router';
import { theme } from '../../theme';
import { Logo } from '~/components/Logo';
import { GuestHeader } from '~/components/GuestHeader';
import { GuestFooter } from '~/components/GuestFooter';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const MAX_W = 1160;
const BREAKPOINT = 900;

// ─── Hoverable card wrapper ───────────────────────────────────────────────────
const HoverCard: React.FC<{ style?: any; children: React.ReactNode }> = ({ style, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <View
      style={[styles.hoverCard, style, hovered && styles.hoverCardActive]}
      // @ts-ignore
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </View>
  );
};

// ─── Feature bento cards ──────────────────────────────────────────────────────

const CardScheduling = () => {
  const { t } = useTranslation();
  return (
    <HoverCard style={{ flex: 2, minWidth: 280 }}>
      <View style={styles.cardIconRow}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
        </View>
      </View>
      <Text style={styles.cardTitle} fontType="bold">{t('landing.cardSchedulingTitle')}</Text>
      <Text style={styles.cardDesc} fontType="regular">
        {t('landing.cardSchedulingDesc')}
      </Text>
      {/* Mini visual */}
      <View style={styles.scheduleMockup}>
        {['Anna M.', 'Carlos R.', 'Tomas K.'].map((name, i) => (
          <View key={i} style={styles.scheduleRow}>
            <View style={[styles.scheduleAvatar, { backgroundColor: i === 0 ? theme.colors.primary : theme.colors.primaryMuted }]} />
            <View style={{ flex: 1 }}>
              <View style={[styles.scheduleBar, { width: `${70 + i * 10}%` as any, opacity: i === 0 ? 1 : 0.5 }]} />
            </View>
            <View style={[styles.scheduleBadge, i === 0 && styles.scheduleBadgeActive]}>
              <Text style={[styles.scheduleBadgeText, i === 0 && { color: theme.colors.primary }]} fontType="medium">
                {i === 0 ? t('landing.cardScheduleBadgeOnSite') : t('landing.cardScheduleBadgeScheduled')}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </HoverCard>
  );
};

const CardLiveMap = () => {
  const { t } = useTranslation();
  return (
    <HoverCard style={{ flex: 1, minWidth: 220 }}>
      <View style={styles.cardIconRow}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
        </View>
      </View>
      <Text style={styles.cardTitle} fontType="bold">{t('landing.cardLiveMapTitle')}</Text>
      <Text style={styles.cardDesc} fontType="regular">
        {t('landing.cardLiveMapDesc')}
      </Text>
      {/* Mini map visual */}
      <View style={styles.mapMockup}>
        <View style={styles.mapGrid}>
          {[...Array(9)].map((_, i) => <View key={i} style={styles.mapGridCell} />)}
        </View>
        <View style={[styles.mapDot, { top: '30%', left: '40%' }]}>
          <Ionicons name="person" size={10} color="#fff" />
        </View>
        <View style={[styles.mapDot, styles.mapDotSecondary, { top: '55%', left: '65%' }]}>
          <Ionicons name="person" size={10} color="#fff" />
        </View>
        <View style={[styles.mapDot, styles.mapDotTertiary, { top: '20%', left: '70%' }]}>
          <Ionicons name="person" size={10} color="#fff" />
        </View>
      </View>
    </HoverCard>
  );
};

const CardTimeTracking = () => {
  const { t } = useTranslation();
  return (
    <HoverCard style={{ flex: 1, minWidth: 220 }}>
      <View style={styles.cardIconRow}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
        </View>
      </View>
      <Text style={styles.cardTitle} fontType="bold">{t('landing.cardTimeTrackingTitle')}</Text>
      <Text style={styles.cardDesc} fontType="regular">
        {t('landing.cardTimeTrackingDesc')}
      </Text>
      {/* Timer visual */}
      <View style={styles.timerMockup}>
        <View style={styles.timerRow}>
          <View style={styles.timerDot} />
          <Text style={styles.timerLabel} fontType="medium">{t('landing.cardTimerActiveSession')}</Text>
          <Text style={styles.timerValue} fontType="bold">6h 42m</Text>
        </View>
        <View style={styles.timerBar}>
          <View style={[styles.timerBarFill, { width: '72%' }]} />
        </View>
        <Text style={styles.timerSub} fontType="regular">Started 07:18 · Site B</Text>
      </View>
    </HoverCard>
  );
};

const CardPayroll = () => {
  const { t } = useTranslation();
  return (
    <HoverCard style={{ flex: 1, minWidth: 220 }}>
      <View style={styles.cardIconRow}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
        </View>
      </View>
      <Text style={styles.cardTitle} fontType="bold">{t('landing.cardPayrollTitle')}</Text>
      <Text style={styles.cardDesc} fontType="regular">
        {t('landing.cardPayrollDesc')}
      </Text>
      {/* Payroll rows */}
      <View style={styles.payrollMockup}>
        {[
          { name: 'Anna M.', hours: '168h', pay: '€2,100' },
          { name: 'Carlos R.', hours: '152h', pay: '€1,900' },
          { name: 'Tomas K.', hours: '160h', pay: '€2,000' },
        ].map((row, i) => (
          <View key={i} style={styles.payrollRow}>
            <Text style={styles.payrollName} fontType="medium" numberOfLines={1}>{row.name}</Text>
            <Text style={styles.payrollHours} fontType="regular">{row.hours}</Text>
            <Text style={styles.payrollPay} fontType="bold">{row.pay}</Text>
          </View>
        ))}
      </View>
    </HoverCard>
  );
};

const CardReplay = () => {
  const { t } = useTranslation();
  return (
    <HoverCard style={{ flex: 2, minWidth: 280 }}>
      <View style={styles.cardIconRow}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="play-outline" size={20} color={theme.colors.primary} />
        </View>
      </View>
      <Text style={styles.cardTitle} fontType="bold">{t('landing.cardReplayTitle')}</Text>
      <Text style={styles.cardDesc} fontType="regular">
        {t('landing.cardReplayDesc')}
      </Text>
      {/* Timeline visual */}
      <View style={styles.replayMockup}>
        <View style={styles.replayTrack}>
          <View style={styles.replayFill} />
          <View style={styles.replayThumb} />
        </View>
        <View style={styles.replayLabels}>
          <Text style={styles.replayLabel} fontType="regular">07:00</Text>
          <Text style={styles.replayLabelActive} fontType="bold">13:24</Text>
          <Text style={styles.replayLabel} fontType="regular">18:00</Text>
        </View>
        <View style={styles.replayEvents}>
          {[t('landing.cardReplayEvent1'), t('landing.cardReplayEvent2'), t('landing.cardReplayEvent3')].map((ev, i) => (
            <View key={i} style={[styles.replayEvent, i === 1 && styles.replayEventActive]}>
              <View style={[styles.replayEventDot, i === 1 && styles.replayEventDotActive]} />
              <Text style={[styles.replayEventText, i === 1 && { color: theme.colors.primary }]} fontType={i === 1 ? 'bold' : 'regular'}>{ev}</Text>
            </View>
          ))}
        </View>
      </View>
    </HoverCard>
  );
};


// ─── Main page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const lg = width >= BREAKPOINT;
  const pad = lg ? theme.spacing(5) : theme.spacing(3);
  const { t } = useTranslation();

  return (
    <View style={styles.root}>

      <GuestHeader variant="landing" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* HERO */}
        <View style={[styles.hero, { paddingHorizontal: pad }]}>
          {/* Animated background — CSS orbs + grid, web only */}
          {Platform.OS === 'web' && (
            // @ts-ignore
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
              <style>{`
                @keyframes orb1 {
                  0%, 100% { transform: translate(0px, 0px) scale(1); }
                  33% { transform: translate(40px, -30px) scale(1.08); }
                  66% { transform: translate(-20px, 20px) scale(0.95); }
                }
                @keyframes orb2 {
                  0%, 100% { transform: translate(0px, 0px) scale(1); }
                  33% { transform: translate(-50px, 30px) scale(1.05); }
                  66% { transform: translate(30px, -20px) scale(0.97); }
                }
                @keyframes orb3 {
                  0%, 100% { transform: translate(0px, 0px) scale(1); }
                  50% { transform: translate(20px, 40px) scale(1.1); }
                }
              `}</style>
              {/* Dot grid */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `radial-gradient(circle, ${theme.colors.primary}22 1px, transparent 1px)`,
                backgroundSize: '28px 28px',
                maskImage: 'radial-gradient(ellipse 80% 80% at 50% 0%, black 30%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 0%, black 30%, transparent 100%)',
              }} />
              {/* Orb 1 — top left */}
              <div style={{
                position: 'absolute', top: '-80px', left: '5%',
                width: 420, height: 420, borderRadius: '50%',
                background: `radial-gradient(circle, ${theme.colors.primary}28 0%, transparent 70%)`,
                filter: 'blur(40px)',
                animation: 'orb1 12s ease-in-out infinite',
              }} />
              {/* Orb 2 — top right */}
              <div style={{
                position: 'absolute', top: '-60px', right: '10%',
                width: 360, height: 360, borderRadius: '50%',
                background: `radial-gradient(circle, ${theme.colors.primary}1A 0%, transparent 70%)`,
                filter: 'blur(50px)',
                animation: 'orb2 15s ease-in-out infinite',
              }} />
              {/* Orb 3 — center */}
              <div style={{
                position: 'absolute', top: '10%', left: '35%',
                width: 500, height: 300, borderRadius: '50%',
                background: `radial-gradient(circle, ${theme.colors.primary}12 0%, transparent 70%)`,
                filter: 'blur(60px)',
                animation: 'orb3 18s ease-in-out infinite',
              }} />
            </div>
          )}
          {/* Content above the animation layer */}
          <View style={{ zIndex: 1, alignItems: 'center', gap: theme.spacing(3), width: '100%' }}>
          <View style={styles.heroPill}>
            <View style={styles.heroPillDot} />
            <Text style={styles.heroPillText} fontType="medium">{t('landing.heroPill')}</Text>
          </View>
          <Text style={[styles.heroTitle, { fontSize: lg ? 72 : 42, lineHeight: lg ? 84 : 52 }]} fontType="bold">
            {t('landing.heroTitle').split('\n').slice(0, 2).join('\n')}{'\n'}
            <Text style={[styles.heroTitle, styles.heroTitleAccent, { fontSize: lg ? 72 : 42, lineHeight: lg ? 84 : 52 }]} fontType="bold">
              {t('landing.heroTitleAccent')}
            </Text>
          </Text>
          <Text style={[styles.heroSub, { maxWidth: lg ? 600 : undefined }]} fontType="regular">
            {t('landing.heroSub')}
          </Text>
          <View style={[styles.heroCTA, { flexDirection: lg ? 'row' : 'column', alignItems: lg ? 'center' : 'stretch', justifyContent: 'center' }]}>
            <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/auth/signup')}>
              <Text style={styles.heroBtnLabel} fontType="medium">{t('landing.heroCTA')}</Text>
              <Ionicons name="arrow-forward" size={15} color="#fff" />
            </TouchableOpacity>
            <Link href="/(guest)/pricing" asChild>
              <TouchableOpacity style={styles.heroGhostBtn}>
                <Text style={styles.heroGhostBtnLabel} fontType="medium">{t('landing.heroSeePricing')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
          <Text style={styles.heroNote} fontType="regular">{t('landing.heroNote')}</Text>
          </View>{/* end inner content View */}
        </View>

        <View style={styles.divider} />

        {/* BENTO FEATURES */}
        <View style={[styles.section, { paddingHorizontal: pad }]}>
          <View style={styles.sectionHead}>
            <Text style={styles.eyebrow} fontType="bold">{t('landing.featuresEyebrow')}</Text>
            <Text style={[styles.sectionTitle, { fontSize: lg ? 40 : 28 }]} fontType="bold">
              {t('landing.featuresTitle')}
            </Text>
            <Text style={styles.sectionSub} fontType="regular">
              {t('landing.featuresSub')}
            </Text>
          </View>

          {/* Row 1 */}
          <View style={[styles.bentoRow, { flexDirection: lg ? 'row' : 'column' }]}>
            <CardScheduling />
            <CardLiveMap />
          </View>

          {/* Row 2 */}
          <View style={[styles.bentoRow, { flexDirection: lg ? 'row' : 'column' }]}>
            <CardTimeTracking />
            <CardPayroll />
            <CardReplay />
          </View>
        </View>

        <View style={styles.divider} />

        {/* HOW IT WORKS */}
        <View style={[styles.section, { paddingHorizontal: pad }]}>
          <View style={styles.sectionHead}>
            <Text style={styles.eyebrow} fontType="bold">{t('landing.howItWorksEyebrow')}</Text>
            <Text style={[styles.sectionTitle, { fontSize: lg ? 40 : 28 }]} fontType="bold">{t('landing.howItWorksTitle')}</Text>
          </View>
          <View style={[styles.stepsRow, { flexDirection: lg ? 'row' : 'column' }]}>
            {[
              { n: '01', title: t('landing.step01Title'), desc: t('landing.step01Desc') },
              { n: '02', title: t('landing.step02Title'), desc: t('landing.step02Desc') },
              { n: '03', title: t('landing.step03Title'), desc: t('landing.step03Desc') },
              { n: '04', title: t('landing.step04Title'), desc: t('landing.step04Desc') },
            ].map((step, i) => (
              <HoverCard key={i} style={[styles.stepCard, lg && { flex: 1 }]}>
                <Text style={styles.stepNum} fontType="bold">{step.n}</Text>
                <Text style={styles.stepTitle} fontType="bold">{step.title}</Text>
                <Text style={styles.stepDesc} fontType="regular">{step.desc}</Text>
              </HoverCard>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* CTA */}
        <View style={[styles.ctaSection, { paddingHorizontal: pad }]}>
          <HoverCard style={[styles.ctaBox, { padding: lg ? theme.spacing(8) : theme.spacing(5) }]}>
            <Text style={[styles.ctaTitle, { fontSize: lg ? 40 : 26 }]} fontType="bold">
              {t('landing.ctaTitle')}
            </Text>
            <Text style={styles.ctaSub} fontType="regular">
              {t('landing.ctaSub')}
            </Text>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/auth/signup')}>
              <Text style={styles.ctaBtnLabel} fontType="medium">{t('landing.ctaButton')}</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </HoverCard>
        </View>

        {/* FOOTER */}
        <GuestFooter />

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.pageBackground },

  // NAV
  scroll: { flexGrow: 1 },
  divider: { height: 1, backgroundColor: theme.colors.borderColor },

  // HERO
  hero: {
    paddingTop: theme.spacing(16),
    paddingBottom: theme.spacing(16),
    width: '100%',
    alignItems: 'center',
    gap: theme.spacing(3),
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    ...Platform.select({
      web: {
        background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${theme.colors.primaryMuted}CC 0%, ${theme.colors.pageBackground} 70%)`,
      } as any,
    }),
  },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1), backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing(1.5), paddingVertical: theme.spacing(0.75), borderWidth: 1, borderColor: theme.colors.primary + '30' },
  heroPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary },
  heroPillText: { fontSize: 11, color: theme.colors.primary, letterSpacing: 0.5 },
  heroTitle: { color: theme.colors.headingText, textAlign: 'center' },
  heroTitleAccent: { color: theme.colors.primary },
  heroSub: { fontSize: 18, lineHeight: 30, color: theme.colors.bodyText, textAlign: 'center' },
  heroCTA: { gap: theme.spacing(1.5), width: '100%' },
  heroBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing(1), backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing(4), paddingVertical: theme.spacing(1.75), borderRadius: theme.radius.lg },
  heroBtnLabel: { fontSize: 15, color: '#fff' },
  heroGhostBtn: { paddingHorizontal: theme.spacing(4), paddingVertical: theme.spacing(1.75), borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderColor, alignItems: 'center', justifyContent: 'center' },
  heroGhostBtnLabel: { fontSize: 15, color: theme.colors.headingText },
  heroNote: { fontSize: 12, color: theme.colors.disabledText },

  // SECTION
  section: { paddingVertical: theme.spacing(10), maxWidth: MAX_W, width: '100%', alignSelf: 'center' },
  sectionHead: { alignItems: 'center', marginBottom: theme.spacing(6), gap: theme.spacing(1.5) },
  eyebrow: { fontSize: 11, letterSpacing: 1.5, color: theme.colors.primary },
  sectionTitle: { color: theme.colors.headingText, textAlign: 'center' },
  sectionSub: { fontSize: 16, lineHeight: 26, color: theme.colors.bodyText, textAlign: 'center', maxWidth: 560 },

  // BENTO
  bentoRow: { gap: theme.spacing(2), marginBottom: theme.spacing(2) },
  hoverCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(3),
    gap: theme.spacing(1.5),
    overflow: 'hidden',
  },
  hoverCardActive: {
    borderColor: theme.colors.primary,
    ...Platform.select({ web: { boxShadow: '0 0 0 1px ' + theme.colors.primary + '40, 0 8px 24px rgba(0,0,0,0.08)' } as any }),
  },
  cardIconRow: { marginBottom: theme.spacing(0.5) },
  cardIconWrap: { width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: theme.colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 18, color: theme.colors.headingText },
  cardDesc: { fontSize: 14, lineHeight: 22, color: theme.colors.bodyText },

  // SCHEDULING MOCK
  scheduleMockup: { marginTop: theme.spacing(2), gap: theme.spacing(1.5), backgroundColor: theme.colors.pageBackground, borderRadius: theme.radius.md, padding: theme.spacing(2) },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5) },
  scheduleAvatar: { width: 28, height: 28, borderRadius: 14 },
  scheduleBar: { height: 8, backgroundColor: theme.colors.primary, borderRadius: 4, opacity: 0.3 },
  scheduleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radius.pill, backgroundColor: theme.colors.pageBackground, borderWidth: 1, borderColor: theme.colors.borderColor },
  scheduleBadgeActive: { backgroundColor: theme.colors.primaryMuted, borderColor: theme.colors.primary },
  scheduleBadgeText: { fontSize: 10, color: theme.colors.disabledText },

  // MAP MOCK
  mapMockup: { marginTop: theme.spacing(2), height: 120, backgroundColor: '#E8F0F8', borderRadius: theme.radius.md, overflow: 'hidden', position: 'relative' },
  mapGrid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap' },
  mapGridCell: { width: '33%', height: '33%', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.05)' },
  mapDot: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  mapDotSecondary: { backgroundColor: theme.colors.secondary },
  mapDotTertiary: { backgroundColor: theme.colors.success },

  // TIMER MOCK
  timerMockup: { marginTop: theme.spacing(2), backgroundColor: theme.colors.pageBackground, borderRadius: theme.radius.md, padding: theme.spacing(2), gap: theme.spacing(1) },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) },
  timerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success },
  timerLabel: { flex: 1, fontSize: 12, color: theme.colors.bodyText },
  timerValue: { fontSize: 18, color: theme.colors.headingText },
  timerBar: { height: 6, backgroundColor: theme.colors.borderColor, borderRadius: 3, overflow: 'hidden' },
  timerBarFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },
  timerSub: { fontSize: 11, color: theme.colors.disabledText },

  // PAYROLL MOCK
  payrollMockup: { marginTop: theme.spacing(2), backgroundColor: theme.colors.pageBackground, borderRadius: theme.radius.md, padding: theme.spacing(1.5), gap: theme.spacing(1) },
  payrollRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) },
  payrollName: { flex: 1, fontSize: 12, color: theme.colors.headingText },
  payrollHours: { fontSize: 11, color: theme.colors.bodyText, width: 36 },
  payrollPay: { fontSize: 13, color: theme.colors.success, width: 52, textAlign: 'right' },

  // REPLAY MOCK
  replayMockup: { marginTop: theme.spacing(2), backgroundColor: theme.colors.pageBackground, borderRadius: theme.radius.md, padding: theme.spacing(2), gap: theme.spacing(1.5) },
  replayTrack: { height: 6, backgroundColor: theme.colors.borderColor, borderRadius: 3, overflow: 'hidden', position: 'relative' },
  replayFill: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '55%', backgroundColor: theme.colors.primary, borderRadius: 3 },
  replayThumb: { position: 'absolute', top: -5, left: '54%', width: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.primary, borderWidth: 2, borderColor: '#fff' },
  replayLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  replayLabel: { fontSize: 10, color: theme.colors.disabledText },
  replayLabelActive: { fontSize: 10, color: theme.colors.primary },
  replayEvents: { gap: theme.spacing(0.75) },
  replayEvent: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) },
  replayEventActive: {},
  replayEventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.borderColor },
  replayEventDotActive: { backgroundColor: theme.colors.primary },
  replayEventText: { fontSize: 11, color: theme.colors.bodyText },

  // STEPS
  stepsRow: { gap: theme.spacing(2) },
  stepCard: { padding: theme.spacing(3), gap: theme.spacing(1) },
  stepNum: { fontSize: 32, color: theme.colors.primary, lineHeight: 40 },
  stepTitle: { fontSize: 16, color: theme.colors.headingText },
  stepDesc: { fontSize: 14, lineHeight: 22, color: theme.colors.bodyText },

  // CTA
  ctaSection: { paddingVertical: theme.spacing(10), maxWidth: MAX_W, width: '100%', alignSelf: 'center' },
  ctaBox: { alignItems: 'center', gap: theme.spacing(2) },
  ctaTitle: { color: theme.colors.headingText, textAlign: 'center', maxWidth: 580 },
  ctaSub: { fontSize: 16, color: theme.colors.bodyText, textAlign: 'center', maxWidth: 480, lineHeight: 26 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1), backgroundColor: theme.colors.primaryMuted, paddingHorizontal: theme.spacing(4), paddingVertical: theme.spacing(1.75), borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.primary, marginTop: theme.spacing(1) },
  ctaBtnLabel: { fontSize: 15, color: theme.colors.primary },
});
