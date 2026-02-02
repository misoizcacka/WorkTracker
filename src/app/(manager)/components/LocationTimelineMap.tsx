import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '~/components/Card';
import { theme } from '~/theme';

interface LocationTimelineMapProps {
  workerId: string;
  date: string;
}

const LocationTimelineMap = ({ workerId, date }: LocationTimelineMapProps) => {
  if (!workerId || !date) {
    return (
      <Card style={styles.container}>
        <Text style={styles.placeholderText}>Select a worker and date to view location timeline.</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <Text style={styles.title}>Location Timeline for {workerId}</Text>
      <Text style={styles.subtitle}>Date: {date}</Text>
      {/* Placeholder for map and timeline actual implementation */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>Map and Timeline will be displayed here.</Text>
        <Text style={styles.placeholderText}>Worker ID: {workerId}</Text>
        <Text style={styles.placeholderText}>Date: {date}</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing(3),
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
    color: theme.colors.headingText,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(2),
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.borderColor,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  placeholderText: {
    color: theme.colors.bodyText,
    fontSize: 16,
    textAlign: 'center',
    marginVertical: theme.spacing(0.5),
  },
});

export default LocationTimelineMap;
