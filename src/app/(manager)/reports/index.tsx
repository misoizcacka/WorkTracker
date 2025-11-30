import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';

const reports = [
  {
    title: 'Worker Hours Report',
    description: 'Detailed breakdown of hours worked by each employee.',
    icon: 'time-outline',
    path: 'worker-hours-report',
  },
  {
    title: 'Payroll Report',
    description: 'Summary of total payroll costs and individual payouts.',
    icon: 'cash-outline',
    path: 'payroll-report',
  },
  {
    title: 'Job / Project Costing Report',
    description: 'Analyze costs and profitability for each project.',
    icon: 'briefcase-outline',
    path: 'job-costing-report',
  },
  {
    title: 'Employee Summary Report',
    description: 'Overview of employee information and activity.',
    icon: 'people-outline',
    path: 'employee-summary-report',
  },
  {
    title: 'Overtime Report',
    description: 'Track and manage all overtime hours logged.',
    icon: 'hourglass-outline',
    path: 'overtime-report',
  },
  {
    title: 'Daily Detailed Report',
    description: 'Drill-down into a worker\'s daily activities and project hours.',
    icon: 'list-outline',
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
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>Reports Hub</Text>
        <View style={styles.grid}>
          {reports.map((report) => (
            <View key={report.title} style={[styles.cardContainer, isLargeScreen ? styles.cardContainerLarge : styles.cardContainerSmall]}>
              <TouchableOpacity onPress={() => handlePress(report.path)}>
                <Card style={styles.reportCard}>
                  <Ionicons name={report.icon as any} size={32} color={theme.colors.primary} style={styles.icon} />
                  <Text style={styles.cardTitle}>{report.title}</Text>
                  <Text style={styles.cardDescription}>{report.description}</Text>
                </Card>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  scrollContentContainer: {
    padding: theme.spacing(3),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(3),
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
  },
  icon: {
    marginBottom: theme.spacing(1.5),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  cardDescription: {
    fontSize: 14,
    color: theme.colors.bodyText,
    lineHeight: 20,
  },
});
