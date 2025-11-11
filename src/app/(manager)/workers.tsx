import React from "react";
import { View, Text, StyleSheet, FlatList, ScrollView } from "react-native";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Card } from "../../components/Card";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";

import { Button } from "../../components/Button";

import { useRouter } from "expo-router";

import { WorkersContext } from "./WorkersContext";

export default function ManagerWorkers() {
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { workers } = React.useContext(WorkersContext)!;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "onSite":
        return theme.colors.success;
      case "offSite":
        return theme.colors.warning;
      default:
        return theme.colors.danger;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "onSite":
        return "🟢 On Site";
      case "offSite":
        return "🟠 Away from Site";
      default:
        return "🔴 Not Checked In";
    }
  };

  const handleCreateWorker = () => {
    router.push("/(manager)/create-worker");
  };

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <View style={{ flex: 1, backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: theme.spacing(3), paddingTop: theme.spacing(3), paddingBottom: tabBarHeight }}>
          <View style={styles.createWorkerContainer}>
            <Button title="Create Worker" onPress={handleCreateWorker} style={styles.loginButton} textStyle={styles.loginButtonText} />
          </View>
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            <FlatList
              data={workers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Card style={styles.workerCard}>
                  <Text style={styles.workerName}>{item.name}</Text>
                  <Text style={styles.workerProject}>{item.project}</Text>
                  <Text style={[styles.workerStatus, { color: getStatusColor(item.status) }]}>
                    {getStatusText(item.status)}
                  </Text>
                  <Text style={styles.workerHours}>{item.hours} hrs today}</Text>
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
  createWorkerContainer: {
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(2),
  },
  scrollViewContent: {
    // No padding here
  },
  workerCard: { marginBottom: theme.spacing(2) },
  loginButton: {
    backgroundColor: "black",
    borderRadius: theme.radius.md,
  },
  loginButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "normal",
  },
  workerName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  workerProject: { fontSize: 14, color: theme.colors.textLight, marginTop: 2 },
  workerStatus: { fontSize: 14, marginTop: 2 },
  workerHours: { fontSize: 16, color: theme.colors.primary, marginTop: 4 },
});
