import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, TextInput } from "react-native";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Card } from "../../../components/Card";
import AnimatedScreen from "../../../components/AnimatedScreen";
import { theme } from "../../../theme";
import { Ionicons } from "@expo/vector-icons";

const FILTERS = ["Yesterday", "This Week", "Last Week", "This Month", "Custom"];

interface Session {
  id: string;
  date: string;
  project: string;
  address: string;
  hours: number;
}

interface MockDataEntry {
  sessions: Session[];
  total: number;
  avg: number;
}

interface MockData {
  [key: string]: MockDataEntry;
}

const mockData: MockData = {
  "Yesterday": {
    sessions: [
      { id: "4", date: "2025-11-10", project: "Facade Inspection", address: "Berlin", hours: 8.0 },
    ],
    total: 8.0,
    avg: 8.0,
  },
  "This Week": {
    sessions: [
      { id: "1", date: "2025-11-10", project: "Facade Inspection", address: "Berlin", hours: 8.0 },
      { id: "2", date: "2025-11-08", project: "Rooftop Garden Setup", address: "Berlin", hours: 6.5 },
    ],
    total: 14.5,
    avg: 7.25,
  },
  "Last Week": {
    sessions: [
      { id: "5", date: "2025-11-03", project: "Office Renovation", address: "Potsdam", hours: 7.5 },
      { id: "6", date: "2025-11-04", project: "Office Renovation", address: "Potsdam", hours: 8.0 },
      { id: "7", date: "2025-11-05", project: "Apartment Painting", address: "Berlin", hours: 8.0 },
      { id: "8", date: "2025-11-06", project: "Apartment Painting", address: "Berlin", hours: 8.0 },
      { id: "9", date: "2025-11-07", project: "Retail Construction", address: "Berlin", hours: 6.0 },
    ],
    total: 37.5,
    avg: 7.5,
  },
  "This Month": {
    sessions: [
        { id: "1", date: "2025-11-10", project: "Facade Inspection", address: "Berlin", hours: 8.0 },
        { id: "2", date: "2025-11-08", project: "Rooftop Garden Setup", address: "Berlin", hours: 6.5 },
        { id: "5", date: "2025-11-03", project: "Office Renovation", address: "Potsdam", hours: 7.5 },
        { id: "6", date: "2025-11-04", project: "Office Renovation", address: "Potsdam", hours: 8.0 },
        { id: "7", date: "2025-11-05", project: "Apartment Painting", address: "Berlin", hours: 8.0 },
        { id: "8", date: "2025-11-06", project: "Apartment Painting", address: "Berlin", hours: 8.0 },
        { id: "9", date: "2025-11-07", project: "Retail Construction", address: "Berlin", hours: 6.0 },
    ],
    total: 52.0,
    avg: 7.43,
  },
  "Custom": {
    sessions: [],
    total: 0,
    avg: 0,
  }
};

export default function WorkerDashboardScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedFilter, setSelectedFilter] = useState<keyof MockData>("This Week");

  const data = mockData[selectedFilter];

  const renderSession = ({ item }: { item: Session }) => (
    <Card style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionDate}>{item.date}</Text>
        <Text style={styles.sessionHours}>{item.hours.toFixed(1)} hrs</Text>
      </View>
      <Text style={styles.sessionProject}>{item.project}</Text>
      <Text style={styles.sessionAddress}>{item.address}</Text>
    </Card>
  );

  const CustomDatePicker = () => (
    <View style={styles.datePickerContainer}>
      <View style={styles.dateInputGroup}>
        <Text style={styles.datePickerLabel}>Start Date</Text>
        <TextInput placeholder="YYYY-MM-DD" style={styles.dateInput} />
      </View>
      <View style={styles.dateInputGroup}>
        <Text style={styles.datePickerLabel}>End Date</Text>
        <TextInput placeholder="YYYY-MM-DD" style={styles.dateInput} />
      </View>
      <TouchableOpacity style={styles.datePickerButton}>
        <Text style={styles.datePickerButtonText}>Apply</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <AnimatedScreen>
      <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
        <FlatList
          data={data.sessions}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Dashboard</Text>
              </View>
              
              <Card style={styles.summaryCard}>
                <Text style={styles.summaryPeriod}>{selectedFilter}</Text>
                <View style={styles.summaryMetrics}>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{data.total.toFixed(1)}</Text>
                    <Text style={styles.metricLabel}>Total Hours</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{data.avg.toFixed(1)}</Text>
                    <Text style={styles.metricLabel}>Avg. Daily</Text>
                  </View>
                </View>
              </Card>

              <View style={styles.filterContainer}>
                <FlatList
                  data={FILTERS}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.filterButton, selectedFilter === item && styles.filterSelected]}
                      onPress={() => setSelectedFilter(item)}
                    >
                      <Text style={[styles.filterText, selectedFilter === item && styles.filterSelectedText]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item}
                />
              </View>

              {selectedFilter === 'Custom' && <CustomDatePicker />}

              <Text style={styles.sessionsTitle}>Work History</Text>
            </>
          }
          renderItem={renderSession}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(1),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  summaryCard: {
    marginHorizontal: theme.spacing(2),
    marginTop: theme.spacing(2),
    padding: theme.spacing(2.5),
  },
  summaryPeriod: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing(2),
  },
  summaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  metricLabel: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  filterContainer: {
    paddingVertical: theme.spacing(2),
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    marginHorizontal: 5,
  },
  filterSelected: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  filterSelectedText: {
    color: '#fff',
  },
  datePickerContainer: {
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  dateInputGroup: {
    marginBottom: theme.spacing(1.5),
  },
  datePickerLabel: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: theme.spacing(1.5),
    fontSize: 16,
  },
  datePickerButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sessionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  listContent: {
    paddingBottom: theme.spacing(2),
  },
  sessionCard: {
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(1.5),
    padding: theme.spacing(2),
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sessionHours: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  sessionProject: {
    fontSize: 15,
    color: theme.colors.text,
    marginVertical: 4,
  },
  sessionAddress: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
});
