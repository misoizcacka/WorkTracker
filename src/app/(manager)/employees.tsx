import React, { useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions, TextInput, Image, TouchableOpacity, ScrollView } from "react-native";
import moment from "moment";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";
import { Button } from "../../components/Button";
import { WorkersContext } from "./WorkersContext";
import InvitePersonModal from "../../components/InvitePersonModal";
import { Card } from "../../components/Card";
import EditPersonModal from "../../components/EditPersonModal";
import RemovePersonModal from "../../components/RemovePersonModal";
import { Worker } from "../../types";
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from "react-native-element-dropdown";

export default function ManagerEmployees() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;
  const context = React.useContext(WorkersContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(false);

  // Calculate total table width
  const fixedColumnWidth = 60 + 100; // Avatar (60) + Actions (100)
  const flexibleColumnCount = 7; // Name, Email, Phone, Status, Role, Joined, Reporting To
  const minFlexibleColumnWidth = theme.spacing(15); // 120px
  const calculatedMinWidth = fixedColumnWidth + (flexibleColumnCount * minFlexibleColumnWidth);
  const totalTableWidth = Math.max(width - theme.spacing(4), calculatedMinWidth); // Subtract padding from screen width


  if (!context) {
    return <Text>Loading...</Text>;
  }


  const { workers, seatsUsed, seatLimit, updateWorker, deleteWorker, getWorkerById } = context;
  const managerCount = workers.filter(w => w.role === 'manager').length;

  const getStatusStyle = (status: Worker['status']) => {
    switch (status) {
      case "active":
        return { color: theme.colors.success, text: "Active" };
      case "invited":
        return { color: theme.colors.warning, text: "Invited" };
      case "pending":
        return { color: theme.colors.warning, text: "Pending" };
      default:
        return { color: theme.colors.danger, text: "Unknown" };
    }
  };

  const handleInviteWorker = () => {
    setInviteModalVisible(true);
  };

  const handleEdit = (worker: Worker) => {
    setSelectedWorker(worker);
    setEditModalVisible(true);
  };

  const handleDelete = (worker: Worker) => {
    setSelectedWorker(worker);
    setRemoveModalVisible(true);
  };

  const handleSaveWorker = (updatedWorker: Worker) => {
    updateWorker(updatedWorker);
    setEditModalVisible(false);
  };

  const handleConfirmRemoveWorker = (workerToRemove: Worker) => {
    setLoading(true);
    deleteWorker(workerToRemove.id);
    setLoading(false);
    setRemoveModalVisible(false);
  };

  const filteredWorkers = workers.filter(worker => {
    const nameMatch = worker.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === 'All' || worker.status === statusFilter.toLowerCase();
    return nameMatch && statusMatch;
  });

  const statusOptions = [
    { label: 'All', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Pending', value: 'Pending' },
  ];

  const renderWorkerRow = (item: Worker) => {

    const statusStyle = getStatusStyle(item.status);

    const manager = item.reporting_to ? getWorkerById(item.reporting_to) : null;



    return (

      <View key={item.id} style={styles.tableRow}>

        <View style={styles.tableCellAvatar}>

          <Image source={{ uri: item.avatar }} style={styles.avatar} />

        </View>

        <Text style={styles.tableCellText}>{item.full_name}</Text>

        <Text style={styles.tableCellText}>{item.email}</Text>

        <Text style={styles.tableCellText}>{item.phone_number || 'N/A'}</Text>

        <View style={styles.tableCell}>

          <View style={[styles.statusBadge, { backgroundColor: statusStyle.color }]}>

            <Text style={styles.statusText}>{statusStyle.text}</Text>

          </View>

        </View>

        <Text style={styles.tableCellText}>{item.role}</Text>

        <Text style={styles.tableCellText}>{moment(item.joined_at).format("MMM D, YYYY")}</Text>

        <Text style={styles.tableCellText}>{item.role === 'manager' ? 'N/A' : manager?.full_name || 'N/A'}</Text>

        <View style={styles.tableCellActions}>

          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>

            <Ionicons name="pencil-outline" size={24} color={theme.colors.primary} />

          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>

            <Ionicons name="trash-outline" size={24} color={theme.colors.danger} />

          </TouchableOpacity>

        </View>

      </View>

    );

  };



  const TableHeader = () => (



    <View style={styles.tableHeaderRow}>



      <Text style={styles.tableHeaderCellAvatar}></Text>



      <Text style={styles.tableHeaderCell}>Name</Text>



      <Text style={styles.tableHeaderCell}>Email</Text>



      <Text style={styles.tableHeaderCell}>Phone</Text>



      <Text style={styles.tableHeaderCell}>Status</Text>



      <Text style={styles.tableHeaderCell}>Role</Text>



      <Text style={styles.tableHeaderCell}>Joined</Text>



      <Text style={styles.tableHeaderCell}>Reporting To</Text>



      <Text style={styles.tableHeaderCellActions}></Text>



    </View>



  );



  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Manage Workers</Text>
        <View style={styles.headerControls}>
          <View style={styles.searchAndFilter}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search workers..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#999"
            />
            <Dropdown
              style={styles.filterDropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={statusOptions}
              maxHeight={300}
              labelField="label"
              valueField="value"
              value={statusFilter}
              onChange={item => {
                setStatusFilter(item.value);
              }}
            />
          </View>
          <View style={styles.headerStatsAndButton}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{seatsUsed}/{seatLimit}</Text>
              <Text style={styles.statLabel}>Workers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{managerCount}</Text>
              <Text style={styles.statLabel}>Managers</Text>
            </View>
            <Button title="Invite" onPress={handleInviteWorker} style={styles.createButton} textStyle={styles.createButtonText} />
          </View>
        </View>
        {seatsUsed / seatLimit >= 0.8 && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning-outline" size={16} color={theme.colors.warning} />
            <Text style={styles.warningText}>
              You are approaching your worker limit. Consider upgrading your plan.
            </Text>
          </View>
        )}
        
        <Card style={styles.tableWrapperCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={{ width: totalTableWidth }}>
              <TableHeader />
              {filteredWorkers.map(renderWorkerRow)}
            </View>
          </ScrollView>
        </Card>
      </View>
      <InvitePersonModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
      />
      <EditPersonModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        worker={selectedWorker}
        onSave={handleSaveWorker}
        allWorkers={workers}
      />
      <RemovePersonModal
        visible={removeModalVisible}
        onClose={() => setRemoveModalVisible(false)}
        worker={selectedWorker}
        onConfirm={handleConfirmRemoveWorker}
        loading={loading}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
  },
  searchAndFilter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    width: 350, // Wider search input
    height: 45,
    backgroundColor: theme.colors.cardBackground,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    fontSize: 16,
    marginRight: theme.spacing(1),
  },
  filterDropdown: {
    width: 120,
    height: 45,
    backgroundColor: theme.colors.cardBackground,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(1),
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#999',
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  headerStatsAndButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: theme.spacing(1.5),
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.bodyText,
    marginTop: theme.spacing(0.5),
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginLeft: theme.spacing(2),
  },
  createButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warningMuted,
    padding: theme.spacing(1),
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing(2),
  },
  warningText: {
    fontSize: 14,
    color: theme.colors.warning,
    marginLeft: theme.spacing(1),
  },
  tableWrapperCard: {
    padding: 0,
    borderRadius: theme.radius.lg,
    ...theme.shadow.soft,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  tableHeaderCell: {
    padding: theme.spacing(2),
    fontWeight: 'bold',
    color: theme.colors.headingText,
    textAlign: 'center',
    flex: 1,
  },
  tableHeaderCellAvatar: {
    width: 60,
    padding: theme.spacing(2),
  },
  tableHeaderCellActions: {
    width: 100,
    padding: theme.spacing(2),
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    backgroundColor: theme.colors.cardBackground,
  },
  tableCell: {
    padding: theme.spacing(2),
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  tableCellAvatar: {
    width: 60,
    padding: theme.spacing(1),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCellText: {
    padding: theme.spacing(2),
    color: theme.colors.bodyText,
    flex: 1,
    textAlign: 'center',
  },
  tableCellActions: {
    width: 100,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: theme.spacing(1),
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  actionButton: {
    padding: theme.spacing(0.5),
  },
});