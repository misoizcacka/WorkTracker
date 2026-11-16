import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Themed';
import { theme } from '../theme';

export interface StatItem {
  label: string;
  value: string;
  labelColor?: string;
  valueColor?: string;
  valueFontSize?: number;
  highlight?: boolean; // If true, uses primary/success color theme
}

interface SummaryStatsPanelProps {
  stats: StatItem[];
  style?: ViewStyle;
}

/**
 * Reusable summary statistics panel component
 * Displays a horizontal row of stat boxes with dividers
 * Used in Payroll Report, Project Labor Report, Worker Timesheet, etc.
 */
export const SummaryStatsPanel: React.FC<SummaryStatsPanelProps> = ({ stats, style }) => {
  return (
    <View style={[styles.container, style]}>
      {stats.map((stat, index) => (
        <React.Fragment key={index}>
          {index > 0 && <View style={styles.divider} />}
          <View style={styles.statBox}>
            <Text 
              style={[
                styles.statLabel, 
                stat.labelColor && { color: stat.labelColor }
              ]} 
              fontType={stat.highlight ? "bold" : "regular"}
            >
              {stat.label}
            </Text>
            <Text 
              style={[
                styles.statValue,
                stat.valueColor && { color: stat.valueColor },
                stat.valueFontSize ? { fontSize: stat.valueFontSize } : undefined
              ]} 
              fontType="bold"
            >
              {stat.value}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.borderColor,
    marginVertical: theme.spacing(1),
  },
  statLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing(0.5),
    textAlign: 'center',
  },
  statValue: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
    textAlign: 'center',
  },
});
