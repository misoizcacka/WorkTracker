import React, { useState, useContext, useMemo } from "react";
import { View, Text, StyleSheet, useWindowDimensions, TextInput, Image, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import Toast from 'react-native-toast-message';
import moment from "moment";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";
import { Button } from "../../components/Button";
import { InvitesContext } from "../../context/InvitesContext";
import { EmployeesContext } from "../../context/EmployeesContext";
import InvitePersonModal from "../../components/InvitePersonModal";
import { Card } from "../../components/Card";
import EditPersonModal from "../../components/EditPersonModal";
import RemovePersonModal from "../../components/RemovePersonModal";
import EditInviteModal from "../../components/EditInviteModal"; // NEW
import { Employee, Invite } from "../../types";
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from "react-native-element-dropdown";




type CombinedEmployeeType = Employee | (Invite & { status: 'pending'; avatar_url: string | null; phone_number: string | null; });

export default function ManagerEmployees() {
  const { width } = useWindowDimensions();
  const employeesContext = useContext(EmployeesContext);
  const invitesContext = useContext(InvitesContext);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editInviteModalVisible, setEditInviteModalVisible] = useState(false); // NEW
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null); // NEW
  const [loading, setLoading] = useState(false); // Used for general loading states, e.g., invite cancellation
  const [isCancellingInvite, setIsCancellingInvite] = useState<string | null>(null); // To track which invite is being cancelled
  const [isSavingInvite, setIsSavingInvite] = useState(false); // NEW: for EditInviteModal saving state

  // Calculate total table width
  const fixedColumnWidth = 60 + 100; // Avatar (60) + Actions (100)
  const flexibleColumnCount = 7; // Name, Email, Phone, Status, Role, Joined, Reporting To
  const minFlexibleColumnWidth = theme.spacing(15); // 120px
  const calculatedMinWidth = fixedColumnWidth + (flexibleColumnCount * minFlexibleColumnWidth);
  const totalTableWidth = Math.max(width - theme.spacing(4), calculatedMinWidth);

  if (!employeesContext || !invitesContext) {
    return <Text>Loading...</Text>; // Consider a proper loading component
  }

  const { employees, seatsUsed, seatLimit, updateEmployee, deleteEmployee, getEmployeeById } = employeesContext;
  const { invites, deleteInvite, updateInvite } = invitesContext; // Destructure invites, deleteInvite, and NEW updateInvite from InvitesContext

  const combinedList = useMemo(() => {
    const pendingInvites = invites.map(invite => ({
      id: invite.id, // Use invite.id for unique key
      full_name: invite.full_name,
      email: invite.email,
      phone_number: null, // Invites don't have phone_number yet
      status: 'pending' as Employee['status'], // Explicitly cast status to be compatible
      role: invite.role,
      company_id: invite.company_id,
      avatar_url: null, // Invites don't have avatar_url yet
      created_at: invite.created_at,
      reporting_to: null, // Invites don't have reporting_to yet
    }));
    return [...employees, ...pendingInvites];
  }, [employees, invites]);

  const handleCancelPending = async (item: CombinedEmployeeType) => {
    if (item.status === 'pending') {
      setIsCancellingInvite(item.id);
      try {
        await deleteInvite(item.id); // Call deleteInvite from InvitesContext
        Toast.show({ type: 'success', text1: 'Invite Cancelled', text2: `Invitation for ${item.full_name} has been cancelled.` });
      } catch (error) {
        console.error("Failed to cancel pending invite", error);
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to cancel invitation.' });
      } finally {
        setIsCancellingInvite(null);
      }
    }
  };

  const handleEditInvite = (invite: Invite) => { // NEW
    setSelectedInvite(invite);
    setEditInviteModalVisible(true);
  };

  const handleSaveInvite = async (updatedInvite: Invite) => { // NEW
    setIsSavingInvite(true);
    try {
      await updateInvite(updatedInvite);
      Toast.show({ type: 'success', text1: 'Invite Updated', text2: `Invitation for ${updatedInvite.full_name} has been updated.` });
      setEditInviteModalVisible(false);
    } catch (error) {
      console.error("Failed to save invite", error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update invitation.' });
    } finally {
      setIsSavingInvite(false);
    }
  };

  const managerCount = employees.filter(e => e.role === 'manager').length;

  const getStatusStyle = (status: Employee['status']) => { // Changed type to Employee['status']
    switch (status) {
      case "active": return { color: theme.colors.success, text: "Active" };
      case "pending": return { color: theme.colors.warning, text: "Pending" };
      case "disabled": return { color: theme.colors.danger, text: "Disabled" };
      default: return { color: theme.colors.iconColor, text: "Unknown" };
    }
  };

  const handleInvite = () => setInviteModalVisible(true);
  const handleEdit = (employee: Employee) => { // Only active employees can be edited
    setSelectedEmployee(employee);
    setEditModalVisible(true);
  };
  const handleDelete = (employee: Employee) => { // Only active employees can be deleted via this flow
    setSelectedEmployee(employee);
    setRemoveModalVisible(true);
  };
  const handleSaveEmployee = async (updatedEmployee: Employee) => {
    await updateEmployee(updatedEmployee);
    setEditModalVisible(false);
  };
  const handleConfirmRemoveEmployee = async (employeeToRemove: Employee) => {
    setLoading(true);
    await deleteEmployee(employeeToRemove.id);
    setLoading(false);
    setRemoveModalVisible(false);
  };

  const filteredItems = combinedList.filter((item: CombinedEmployeeType) => {
    const nameMatch = item.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === 'All' || item.status === statusFilter.toLowerCase();
    return nameMatch && statusMatch;
  });

  const statusOptions = [
    { label: 'All', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Disabled', value: 'Disabled' },
  ];

  const renderEmployeeRow = (item: CombinedEmployeeType) => {
    const statusStyle = getStatusStyle(item.status as Employee['status']); // Cast status for getStatusStyle
    const isPendingInvite = item.status === 'pending';
    const manager = !isPendingInvite && (item as Employee).reporting_to && typeof (item as Employee).reporting_to === 'string' ? getEmployeeById((item as Employee).reporting_to!) : null; // Use non-null assertion

    return (
      <View key={item.id} style={styles.tableRow}>
        <View style={styles.tableCellAvatar}>
          <Image source={{ uri: item.avatar_url || 'https://i.imgur.com/1nSAQlW.png' }} style={styles.avatar} />
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
        <Text style={styles.tableCellText}>{moment(item.created_at).format("MMM D, YYYY")}</Text>
        <Text style={styles.tableCellText}>
            {isPendingInvite ? 'N/A' : (item.role === 'manager' ? 'N/A' : manager?.full_name || 'N/A')}
        </Text>
        <View style={styles.tableCellActions}>
          {isPendingInvite ? (
            <>
              <TouchableOpacity onPress={() => handleEditInvite(item as Invite)} style={styles.actionButton}>
                <Ionicons name="pencil-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleCancelPending(item)} style={[styles.actionButton, { flexDirection: 'column', alignItems: 'center' }]} disabled={isCancellingInvite === item.id}>
                {isCancellingInvite === item.id ? (
                  <ActivityIndicator size="small" color={theme.colors.danger} />
                ) : (
                  <Ionicons name="close-circle-outline" size={24} color={theme.colors.danger} />
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => handleEdit(item as Employee)} style={styles.actionButton}>
                <Ionicons name="pencil-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item as Employee)} style={styles.actionButton}>
                <Ionicons name="trash-outline" size={24} color={theme.colors.danger} />
              </TouchableOpacity>
            </>
          )}
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
        <Text style={styles.title}>Manage Team</Text>
        <View style={styles.headerControls}>
          <View style={styles.searchAndFilter}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
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
              onChange={item => setStatusFilter(item.value)}
            />
          </View>
          <View style={styles.headerStatsAndButton}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{seatsUsed}/{seatLimit}</Text>
              <Text style={styles.statLabel}>Seats Used</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{managerCount}</Text>
              <Text style={styles.statLabel}>Managers</Text>
            </View>
            <Button title="Invite" onPress={handleInvite} style={styles.createButton} textStyle={styles.createButtonText} />
          </View>
        </View>
        


        <Card style={styles.tableWrapperCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={{ width: totalTableWidth }}>
              <TableHeader />
              {filteredItems.map(renderEmployeeRow)}
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
        employee={selectedEmployee}
        onSave={handleSaveEmployee}
        allEmployees={employees}
      />
      <RemovePersonModal
        visible={removeModalVisible}
        onClose={() => setRemoveModalVisible(false)}
        employee={selectedEmployee}
        onConfirm={handleConfirmRemoveEmployee}
        loading={loading}
      />
      <EditInviteModal // NEW
        visible={editInviteModalVisible}
        onClose={() => setEditInviteModalVisible(false)}
        invite={selectedInvite}
        onSave={handleSaveInvite}
        loading={isSavingInvite}
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
    width: 350,
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
  placeholderStyle: { fontSize: 16, color: '#999' },
  selectedTextStyle: { fontSize: 16 },
  headerStatsAndButton: { flexDirection: 'row', alignItems: 'center' },
  statItem: { alignItems: 'center', marginHorizontal: theme.spacing(1.5) },
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
  createButtonText: { color: "white", fontSize: 14, fontWeight: "bold" },
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
  tableHeaderCellAvatar: { width: 60, padding: theme.spacing(2) },
  tableHeaderCellActions: { width: 100, padding: theme.spacing(2) },
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
  avatar: { width: 40, height: 40, borderRadius: 20 },
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
  actionButton: { padding: theme.spacing(0.5) },
  actionButtonText: {
    fontSize: 12,
    color: theme.colors.bodyText,
    marginTop: theme.spacing(0.5),
  },
  // Styles for PendingInvites
  invitesCard: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
  },
  invitesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1.5),
  },
  inviteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteName: {
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  inviteEmail: {
    fontSize: 14,
    color: theme.colors.bodyText,
  },
});