import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from "react-native";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Card } from "../../components/Card";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";

export default function ManagerReports() {
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedMonth, setSelectedMonth] = useState("October 2025");

  const reports = [
    { id: "1", name: "John Worker", totalHours: 168 },
    { id: "2", name: "Maria Builder", totalHours: 160 },
    { id: "3", name: "Lars Mason", totalHours: 152 },
  ];

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <View style={{ flex: 1, backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing(3), paddingBottom: tabBarHeight }}>
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            {/* Month selector */}
            <View style={styles.monthSelector}>
              {["October 2025", "September 2025", "August 2025"].map((month) => (
                <TouchableOpacity key={month} onPress={() => setSelectedMonth(month)}>
                  <Text
                    style={[
                      styles.monthButton,
                      month === selectedMonth && styles.monthButtonActive,
                    ]}
                  >
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Hours Worked ({selectedMonth})</Text>
            <FlatList
              data={reports}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Card style={styles.reportCard}>
                  <Text style={styles.workerName}>{item.name}</Text>
                  <Text style={styles.workerHours}>{item.totalHours} hrs</Text>
                  <Text style={styles.workerPay}>
                    €{(item.totalHours * 20).toFixed(2)} (at €20/hr)
                  </Text>
                </Card>
              )}
            />
          </ScrollView>
        </View>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollViewContent: {
    // No padding here
  },
  monthSelector: { flexDirection: "row", justifyContent: "space-around", marginBottom: theme.spacing(3) },
  monthButton: { fontSize: 14, color: theme.colors.textLight },
  monthButtonActive: { color: theme.colors.primary, fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: theme.spacing(2) },
  reportCard: { marginBottom: theme.spacing(2) },
  workerName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  workerHours: { fontSize: 16, color: theme.colors.textLight },
  workerPay: { fontSize: 16, color: theme.colors.primary, marginTop: 2 },
});
