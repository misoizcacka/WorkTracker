import React, { useRef, useState } from "react";
import { StyleSheet, View, ScrollView, Image, TouchableOpacity, Linking } from "react-native";
import { Text } from "../../components/Themed";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { theme } from "../../theme";
import AnimatedScreen from "../../components/AnimatedScreen";
import { useSession } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useEmployeeProfile } from "../../hooks/useEmployeeProfile";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "../../components/LanguagePicker";

export default function WorkerAccountScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { signOut, user, userRole, userCompanyName } = useSession()!;
  const { profile } = useEmployeeProfile();
  const router = useRouter();
  const { t } = useTranslation();

  // Hidden diagnostic entry — triple-tap the version text at the bottom
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [diagnosticUnlocked, setDiagnosticUnlocked] = useState(false);

  const handleVersionTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      setDiagnosticUnlocked(true);
      router.push('/(worker)/diagnostics');
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 800);
    }
  };

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member';
  const displayRole = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'Worker';

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + theme.spacing(4) }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.title} fontType="bold">{t('worker.account.title')}</Text>
            <Text style={styles.subtitle}>{t('worker.account.subtitle')}</Text>
          </View>

          <View style={styles.content}>
            {/* Profile Overview Card */}
            <Card style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  {profile?.public_avatar_url ? (
                    <Image source={{ uri: profile.public_avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={40} color="white" />
                  )}
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.userName} fontType="bold">{fullName}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText} fontType="bold">{displayRole.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="keypad-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('worker.account.access')}</Text>
                  <Text style={styles.detailValue} fontType="medium">{t('worker.account.accessDescription')}</Text>
                </View>
              </View>

              {userCompanyName && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="business-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>{t('worker.account.company')}</Text>
                    <Text style={styles.detailValue} fontType="medium">{userCompanyName}</Text>
                  </View>
                </View>
              )}
            </Card>

            {/* Language Picker */}
            <Card style={styles.settingsCard}>
              <View style={styles.settingsRow}>
                <View style={styles.settingsLeft}>
                  <Ionicons name="language-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.settingsLabel} fontType="medium">{t('worker.account.language')}</Text>
                </View>
                <LanguagePicker />
              </View>
            </Card>

            {/* Privacy Policy link */}
            <TouchableOpacity
              style={styles.privacyRow}
              onPress={() => Linking.openURL('https://koordinate.app/privacy')}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.privacyText} fontType="regular">{t('worker.account.privacyPolicy')}</Text>
              <Ionicons name="open-outline" size={14} color={theme.colors.disabledText} />
            </TouchableOpacity>

            {/* Logout */}
            <View style={styles.logoutContainer}>
              <Button
                title={t('worker.account.logOut')}
                onPress={() => signOut()}
                style={styles.logoutButton}
                textStyle={styles.logoutButtonText}
              />
            </View>

            {/* Hidden diagnostic entry — triple-tap to unlock */}
            <TouchableOpacity onPress={handleVersionTap} activeOpacity={1} style={styles.versionTap}>
              <Text style={styles.versionText}>{t('worker.account.version', { version: '1.0' })}</Text>
            </TouchableOpacity>

            {diagnosticUnlocked && (
              <TouchableOpacity
                style={styles.diagnosticsButton}
                onPress={() => router.push('/(worker)/diagnostics')}
              >
                <Ionicons name="pulse-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.diagnosticsButtonText} fontType="medium">{t('worker.account.locationDiagnostics')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  scrollContent: {
    paddingTop: theme.spacing(3),
  },
  pageHeader: {
    paddingHorizontal: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  title: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
  },
  subtitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: theme.spacing(3),
  },
  profileCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(2),
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    color: theme.colors.headingText,
  },
  roleBadge: {
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: theme.spacing(1),
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
    marginVertical: theme.spacing(2),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(1.5),
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.disabledText,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.headingText,
  },
  settingsCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(0.5),
    paddingHorizontal: theme.spacing(1),
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
  },
  settingsLabel: {
    fontSize: 14,
    color: theme.colors.headingText,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.primary,
  },
  logoutContainer: {
    alignItems: 'center',
    marginTop: theme.spacing(2),
  },
  logoutButton: {
    width: '100%',
    height: 50,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.danger,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 15,
  },
  versionTap: {
    alignItems: 'center',
    paddingVertical: theme.spacing(2),
    marginTop: theme.spacing(1),
  },
  versionText: {
    fontSize: 11,
    color: theme.colors.disabledText,
  },
  diagnosticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
  },
  diagnosticsButtonText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
  },
});
