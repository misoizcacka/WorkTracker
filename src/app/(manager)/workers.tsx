import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, useWindowDimensions, TextInput, Image } from "react-native";
import { Card } from "../../components/Card";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";
import { Button } from "../../components/Button";
import { WorkersContext } from "./WorkersContext";
import InviteWorkerModal from "../../components/InviteWorkerModal";
import { Worker } from "../../types";

export default function ManagerWorkers() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;
  const context = React.useContext(WorkersContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  if (!context) {
    return <Text>Loading...</Text>;
  }

  const { workers, seatsUsed, seatLimit } = context;

  const getStatusStyle = (status: Worker['status']) => {
    switch (status) {
      case "active":
        return { color: theme.colors.success, text: "Active" };
      case "invited":
        return { color: theme.colors.warning, text: "Invited" };
      case "pending":
        return { color: theme.colors.bodyText, text: "Pending" };
      default:
        return { color: theme.colors.danger, text: "Unknown" };
    }
  };

  const handleInviteWorker = () => {
    setModalVisible(true);
  };

  const filteredWorkers = workers.filter(worker =>
    worker.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderWorkerCard = ({ item }: { item: Worker }) => {
    const statusStyle = getStatusStyle(item.status);
    return (
      <Card style={styles.workerCard}>
        <View style={styles.cardHeader}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View style={styles.headerText}>
            <Text style={styles.workerName}>{item.full_name}</Text>
            <Text style={styles.workerEmail}>{item.email}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: statusStyle.color }]} />
            <Text style={[styles.workerStatus, { color: statusStyle.color }]}>{statusStyle.text}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search workers..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#999"
          />
          <Button title="Invite Worker" onPress={handleInviteWorker} style={styles.createButton} textStyle={styles.createButtonText} />
        </View>
        <View style={styles.seatInfoContainer}>
          <Text style={styles.seatInfoText}>Seats Used: {seatsUsed} of {seatLimit}</Text>
        </View>
        <FlatList
          data={filteredWorkers}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkerCard}
          numColumns={isLargeScreen ? 2 : 1}
          key={isLargeScreen ? 'two-columns' : 'one-column'}
          contentContainerStyle={styles.listContent}
        />
      </View>
      <InviteWorkerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
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
    height: 45,
    backgroundColor: 'white',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    marginRight: theme.spacing(2),
    fontSize: 16,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  seatInfoContainer: {
    marginBottom: theme.spacing(2),
    alignItems: 'flex-start',
  },
  seatInfoText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.bodyText,
  },
  listContent: {
    paddingBottom: theme.spacing(10),
  },
  workerCard: {
    flex: 1,
    margin: theme.spacing(1),
    padding: theme.spacing(2),
    backgroundColor: 'white'
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
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.headingText,
  },
  workerEmail: {
    fontSize: 14,
    color: theme.colors.bodyText,
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
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: theme.spacing(1),
  },
  workerStatus: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
