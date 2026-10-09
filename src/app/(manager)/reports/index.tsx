import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Text } from '~/components/Themed';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { useTranslation } from 'react-i18next';

export default function ReportsHub() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const { t } = useTranslation();

  const reports = [
    {
      title: t('manager.reports.employeeHoursTitle'),
      description: t('manager.reports.employeeHoursDesc'),
      icon: 'time-outline',
      path: 'employee-hours-report',
      comingSoon: false,
    },
    {
      title: t('manager.reports.payrollSummaryTitle'),
      description: t('manager.reports.payrollSummaryDesc'),
      icon: 'cash-outline',
      path: 'payroll-report',
      comingSoon: false,
    },
    {
      title: t('manager.reports.projectLaborTitle'),
      description: t('manager.reports.projectLaborDesc'),
      icon: 'briefcase-outline',
      path: 'project-labor-report',
      comingSoon: true,
    },
    {
      title: t('manager.reports.dailyDetailedTitle'),
      description: t('manager.reports.dailyDetailedDesc'),
      icon: 'analytics-outline',
      path: 'daily-detailed-report',
      comingSoon: false,
    },
  ];

  const handlePress = (path: string) => {
    router.push(`/reports/${path}`);
  };

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle} fontType="bold">{t('manager.reports.title')}</Text>
        <Text style={styles.pageSubtitle}>{t('manager.reports.subtitle')}</Text>
      </View>
      <View style={styles.mainContentCard}>
        <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
            {reports.map((report) => (
                <View key={report.title} style={[styles.cardContainer, isLargeScreen ? styles.cardContainerLarge : styles.cardContainerSmall]}>
                <TouchableOpacity onPress={() => !report.comingSoon && handlePress(report.path)} disabled={report.comingSoon} activeOpacity={report.comingSoon ? 1 : 0.7}>
                    <Card style={[styles.reportCard, report.comingSoon ? styles.reportCardDisabled : undefined] as any}>
                    {report.comingSoon && (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText} fontType="bold">{t('manager.reports.comingSoon')}</Text>
                      </View>
                    )}
                    <Ionicons name={report.icon as any} size={32} color={report.comingSoon ? theme.colors.disabledText : theme.colors.primary} style={styles.icon} />
                    <Text style={[styles.cardTitle, report.comingSoon && { color: theme.colors.disabledText }]} fontType="bold">{report.title}</Text>
                    <Text style={styles.cardDescription}>{report.description}</Text>
                    </Card>
                </TouchableOpacity>
                </View>
            ))}
            </View>
        </ScrollView>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
    mainContentCard: {
        flex: 1,
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        padding: theme.spacing(2),
        marginHorizontal: theme.spacing(2),
        marginBottom: theme.spacing(2),
        ...Platform.select({
          web: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
          },
          native: {
            elevation: 6,
          },
        }),
    },
    pageHeader: {
        paddingVertical: theme.spacing(4),
        paddingHorizontal: theme.spacing(2),
        backgroundColor: theme.colors.background,
        alignItems: 'flex-start',
    },
    pageTitle: {
        fontSize: theme.fontSizes.xl,
        color: theme.colors.headingText,
        marginBottom: theme.spacing(0.5),
    },
    pageSubtitle: {
        fontSize: theme.fontSizes.lg,
        color: theme.colors.bodyText,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        margin: -theme.spacing(1),
    },
    cardContainer: {
        padding: theme.spacing(1),
    },
    cardContainerSmall: {
        width: '100%',
    },
    cardContainerLarge: {
        width: '50%',
    },
    reportCard: {
        padding: theme.spacing(2.5),
        height: '100%',
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        position: 'relative',
        overflow: 'hidden',
    },
    reportCardDisabled: {
        opacity: 0.6,
        backgroundColor: theme.colors.pageBackground,
    },
    comingSoonBadge: {
        position: 'absolute',
        top: theme.spacing(1.5),
        right: theme.spacing(1.5),
        backgroundColor: theme.colors.primaryMuted,
        borderRadius: theme.radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    comingSoonText: {
        fontSize: 10,
        color: theme.colors.primary,
        letterSpacing: 0.5,
    },
    icon: {
        marginBottom: theme.spacing(1.5),
    },
    cardTitle: {
        fontSize: theme.fontSizes.lg,
        color: theme.colors.headingText,
        marginBottom: theme.spacing(0.5),
    },
    cardDescription: {
        fontSize: theme.fontSizes.sm,
        color: theme.colors.bodyText,
        lineHeight: 20,
    },
});
