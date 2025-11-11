import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from "react-native";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Card } from "../../components/Card";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";

export default function ManagerDashboard() {
  const tabBarHeight = useBottomTabBarHeight();
  const stats = {
    activeWorkers: 12,
    totalWorkers: 18,
    activeProjects: 5,
    totalHoursToday: 74.5,
  };

  const projects = [
    { id: "1", name: "Office Renovation", workers: 8, hours: 42.5 },
    { id: "2", name: "Apartment Painting", workers: 5, hours: 28.0 },
    { id: "3", name: "Retail Construction", workers: 3, hours: 15.5 },
  ];

    return (
      <AnimatedScreen>
        <View style={styles.container}>
          <View style={{ flex: 1, backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing(3), paddingBottom: tabBarHeight }}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
              <View style={styles.statsRow}>
                <Card style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {stats.activeWorkers}/{stats.totalWorkers}
                  </Text>
                  <Text style={styles.statLabel}>Workers Active</Text>
                </Card>
                <Card style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.activeProjects}</Text>
                  <Text style={styles.statLabel}>Projects</Text>
                </Card>
                <Card style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.totalHoursToday}</Text>
                  <Text style={styles.statLabel}>Hours Today</Text>
                </Card>
              </View>
  
              <Text style={styles.sectionTitle}>Projects Overview</Text>
              <FlatList
                data={projects}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Card style={{ marginBottom: theme.spacing(2) }}>
                    <Text style={styles.projectName}>{item.name}</Text>
                    <Text style={styles.projectDetail}>
                      Workers: {item.workers} | Hours: {item.hours}
                    </Text>
                  </Card>
                )}
              />
            </ScrollView>
          </View>
        </View>
      </AnimatedScreen>
    );}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  scrollViewContent: {
    // No padding here
  },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: theme.spacing(3) },
  statCard: { flex: 1, marginHorizontal: 4, alignItems: "center", paddingVertical: theme.spacing(2) },
  statValue: { fontSize: 20, fontWeight: "700", color: theme.colors.primary },
  statLabel: { fontSize: 14, color: theme.colors.textLight },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: theme.spacing(2) },
  projectName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  projectDetail: { fontSize: 14, color: theme.colors.textLight, marginTop: 2 },
});
