import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Text } from '../../components/Themed';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PRIVACY_NOTICE_ACCEPTED_KEY = 'privacy_notice_accepted';

interface Props {
  onAccept: () => void;
}

export function WorkerPrivacyNotice({ onAccept }: Props) {
  const { t } = useTranslation();

  const handleAccept = async () => {
    await AsyncStorage.setItem(PRIVACY_NOTICE_ACCEPTED_KEY, 'true');
    onAccept();
  };

  const sections = [
    { heading: t('worker.privacy.locationHeading'), body: t('worker.privacy.locationBody'), icon: 'location-outline' as const },
    { heading: t('worker.privacy.dataHeading'), body: t('worker.privacy.dataBody'), icon: 'document-text-outline' as const },
    { heading: t('worker.privacy.retentionHeading'), body: t('worker.privacy.retentionBody'), icon: 'time-outline' as const },
    { heading: t('worker.privacy.rightsHeading'), body: t('worker.privacy.rightsBody'), icon: 'shield-checkmark-outline' as const },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark-outline" size={48} color={theme.colors.primary} />
        </View>

        <Text style={styles.title} fontType="bold">{t('worker.privacy.title')}</Text>
        <Text style={styles.intro} fontType="regular">{t('worker.privacy.intro')}</Text>

        {sections.map((section, i) => (
          <View key={i} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={18} color={theme.colors.primary} />
              <Text style={styles.sectionHeading} fontType="bold">{section.heading}</Text>
            </View>
            <Text style={styles.sectionBody} fontType="regular">{section.body}</Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.policyLink}
          onPress={() => Linking.openURL('https://koordinate.app/privacy')}
          activeOpacity={0.7}
        >
          <Text style={styles.policyLinkText} fontType="regular">{t('worker.privacy.policyLink')}</Text>
          <Ionicons name="open-outline" size={14} color={theme.colors.primary} />
        </TouchableOpacity>

        <Text style={styles.poweredBy} fontType="regular">{t('worker.privacy.poweredBy')}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.acceptButtonText} fontType="bold">{t('worker.privacy.confirm')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    padding: theme.spacing(4),
    paddingBottom: theme.spacing(12),
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: theme.spacing(3),
    marginTop: theme.spacing(2),
  },
  title: {
    fontSize: 26,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(1.5),
  },
  intro: {
    fontSize: 15,
    color: theme.colors.bodyText,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing(4),
  },
  section: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2.5),
    marginBottom: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  sectionHeading: {
    fontSize: 14,
    color: theme.colors.headingText,
  },
  sectionBody: {
    fontSize: 14,
    color: theme.colors.bodyText,
    lineHeight: 21,
  },
  policyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  policyLinkText: {
    fontSize: 13,
    color: theme.colors.primary,
  },
  poweredBy: {
    fontSize: 11,
    color: theme.colors.disabledText,
    textAlign: 'center',
    marginTop: theme.spacing(2),
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(3),
    paddingBottom: theme.spacing(4),
    backgroundColor: theme.colors.pageBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
