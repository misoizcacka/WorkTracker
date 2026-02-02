import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Text } from '~/components/Themed';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';

const reports = [
  {
    title: 'Employee Hours',
    description: 'Drill down into daily breakdowns of employee work hours.',
    icon: 'time-outline',
    path: 'employee-hours-report',
  },
  {
    title: 'Payroll Summary',
    description: 'View and export payable hours for each employee for the month.',
    icon: 'cash-outline',
    path: 'payroll-report',
  },
  {
    title: 'Project Labor Report',
    description: 'Analyze labor costs and hours for each project.',
    icon: 'briefcase-outline',
    path: 'project-labor-report',
  },
  {
    title: 'Daily Activity',
    description: 'A quick look at who worked today and what they did.',
    icon: 'speedometer-outline',
    path: 'daily-activity-report',
  },
  {
    title: 'Daily Detailed Report',
    description: "Get a detailed, chronological breakdown of each worker's day.",
    icon: 'analytics-outline',
    path: 'daily-detailed-report',
  },
];

export default function ReportsHub() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const handlePress = (path: string) => {
    router.push(`/reports/${path}`);
  };

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle} fontType="bold">Reports Hub</Text>
        <Text style={styles.pageSubtitle}>View and export summaries of company data.</Text>
      </View>
      <View style={styles.mainContentCard}>
        <ScrollView>
            <View style={styles.grid}>
            {reports.map((report) => (
                <View key={report.title} style={[styles.cardContainer, isLargeScreen ? styles.cardContainerLarge : styles.cardContainerSmall]}>
                <TouchableOpacity onPress={() => handlePress(report.path)}>
                    <Card style={styles.reportCard}>
                    <Ionicons name={report.icon as any} size={32} color={theme.colors.primary} style={styles.icon} />
                    <Text style={styles.cardTitle} fontType="bold">{report.title}</Text>
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
    },
    icon: {
        marginBottom: theme.spacing(1.5),
    },
    cardTitle: {
        fontSize: 18,
        color: theme.colors.headingText,
        marginBottom: theme.spacing(0.5),
    },
    cardDescription: {
        fontSize: 14,
        color: theme.colors.bodyText,
        lineHeight: 20,
    },
});
