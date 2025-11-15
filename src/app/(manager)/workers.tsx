import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, useWindowDimensions, TextInput, Image } from "react-native";
import { Card } from "../../components/Card";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";
import { Button } from "../../components/Button";
import { useRouter } from "expo-router";
import { WorkersContext } from "./WorkersContext";

export default function ManagerWorkers() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;
  const router = useRouter();
  const { workers } = React.useContext(WorkersContext)!;
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleCreateWorker = () => {
    router.push("/(manager)/create-worker");
  };

  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderWorkerCard = ({ item }: { item: any }) => (
    <Card style={styles.workerCard}>
      <View style={styles.cardHeader}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.headerText}>
          <Text style={styles.workerName}>{item.name}</Text>
          <Text style={styles.workerProject}>{item.project}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={styles.workerStatus}>{item.status.replace(/([A-Z])/g, ' $1')}</Text>
        </View>
        <Text style={styles.workerHours}>{item.hours} hrs today</Text>
      </View>
    </Card>
  );

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search workers..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          <Button title="Create Worker" onPress={handleCreateWorker} style={styles.createButton} textStyle={styles.createButtonText} />
        </View>
        <FlatList
          data={filteredWorkers}
          keyExtractor={(item) => item.id as string}
          renderItem={renderWorkerCard}
          numColumns={isLargeScreen ? 2 : 1}
          key={isLargeScreen ? 'two-columns' : 'one-column'}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: theme.spacing(2),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: theme.colors.lightBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
  },
  createButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "normal",
  },
  listContent: {
    paddingBottom: theme.spacing(10),
  },
  workerCard: {
    flex: 1,
    margin: theme.spacing(1),
    padding: theme.spacing(2),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: theme.spacing(2),
  },
  headerText: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  workerProject: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(1),
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing(1),
  },
  workerStatus: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  workerHours: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
