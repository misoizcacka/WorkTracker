import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { theme } from "../../theme";

const FILTERS = ["This Week", "Last Week", "This Month", "Custom"];

export default function WorkerDashboardScreen() {
  const [selectedFilter, setSelectedFilter] = useState("This Week");

  const mockSessions = [
    { id: "1", date: "2025-10-30", project: "Office Renovation", address: "Stockholm", hours: 7.5 },
    { id: "2", date: "2025-10-31", project: "Apartment Painting", address: "Uppsala", hours: 8 },
    { id: "3", date: "2025-11-01", project: "Retail Construction", address: "Södermalm", hours: 6.75 },
  ];

  const totalHours = mockSessions.reduce((sum, s) => sum + s.hours, 0);
  const avgHours = totalHours / mockSessions.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Work Summary</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Filter bar */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} onPress={() => setSelectedFilter(f)}>
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === f && styles.filterSelected,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary card */}
        <Card style={{ width: "100%", marginBottom: theme.spacing(2) }}>
          <Text style={styles.summaryLabel}>Period:</Text>
          <Text style={styles.summaryValue}>{selectedFilter}</Text>

          <View style={{ marginTop: theme.spacing(2) }}>
            <Text style={styles.summaryLabel}>Total Hours</Text>
            <Text style={styles.summaryBig}>{totalHours.toFixed(1)} hrs</Text>

            <Text style={styles.summaryLabel}>Average per Day</Text>
            <Text style={styles.summarySmall}>{avgHours.toFixed(1)} hrs</Text>
          </View>
        </Card>

        {/* Session list */}
        <FlatList
          data={mockSessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.sessionCard}>
              <Text style={styles.sessionDate}>{item.date}</Text>
              <Text style={styles.sessionProject}>{item.project}</Text>
              <Text style={styles.sessionAddress}>{item.address}</Text>
              <Text style={styles.sessionHours}>{item.hours.toFixed(2)} hrs</Text>
            </Card>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing(3),
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightBorder,
  },
  scrollViewContent: {
    paddingHorizontal: theme.spacing(3),
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing(2),
    textAlign: "center",
    paddingTop: theme.spacing(2),
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: theme.spacing(3),
  },
  filterText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: theme.colors.textLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  filterSelected: {
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },
  summaryLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: theme.colors.textLight,
  },
  summaryValue: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: theme.colors.text,
  },
  summaryBig: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: theme.colors.primary,
  },
  summarySmall: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: theme.colors.text,
  },
  sessionCard: {
    marginBottom: theme.spacing(2),
  },
  sessionDate: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: theme.colors.text,
  },
  sessionProject: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    color: theme.colors.text,
    marginTop: 2,
  },
  sessionAddress: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  sessionHours: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: theme.colors.primary,
    marginTop: 4,
  },
});
