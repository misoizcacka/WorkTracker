import React, { useState, useContext, useMemo } from "react";
import { View, StyleSheet, useWindowDimensions, TextInput, Image, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import { Text } from "../../components/Themed";
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

  const fixedColumnWidths = {
    avatar: 60,
    phone: 120,
    status: 100,
    role: 100,
    joined: 150, // Increased from 120
    actions: 100,
  };

  const flexibleColumnMinLengths = {
    name: 100, // Reduced from 150
    email: 150, // Reduced from 200
    reportingTo: 150,
  };

  const fixedWidthsSum = Object.values(fixedColumnWidths).reduce((sum, width) => sum + width, 0);
  const flexibleMinWidthsSum = Object.values(flexibleColumnMinLengths).reduce((sum, width) => sum + width, 0);

  const minTableContentWidth = fixedWidthsSum + flexibleMinWidthsSum; // This will be the minimum width the table content needs.

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
      case "active": return { color: theme.colors.success, text: "Active", };
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
        <View style={[styles.tableCell, { width: fixedColumnWidths.avatar }]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <Ionicons name="person" size={40} color={theme.colors.bodyText} style={styles.avatarPlaceholder} />
          )}
        </View>
        <Text style={[styles.tableCellText, { flex: 1, minWidth: flexibleColumnMinLengths.name }]} numberOfLines={1} ellipsizeMode="tail">{item.full_name}</Text>
        <Text style={[styles.tableCellText, { flex: 1, minWidth: flexibleColumnMinLengths.email }]} numberOfLines={1} ellipsizeMode="tail">{item.email}</Text>
        <Text style={[styles.tableCellText, { width: fixedColumnWidths.phone }]} numberOfLines={1} ellipsizeMode="tail">{item.phone_number || 'N/A'}</Text>
        <View style={[styles.tableCell, { width: fixedColumnWidths.status }]}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.color }]}>
            <Text style={styles.statusText} fontType="regular">{statusStyle.text}</Text>
          </View>
        </View>
        <Text style={[styles.tableCellText, { width: fixedColumnWidths.role }]} numberOfLines={1} ellipsizeMode="tail">{item.role}</Text>
        <Text style={[styles.tableCellText, { width: fixedColumnWidths.joined }]} numberOfLines={1} ellipsizeMode="tail">{moment(item.created_at).format("MMM D, YYYY")}</Text>
        <Text style={[styles.tableCellText, { flex: 1, minWidth: flexibleColumnMinLengths.reportingTo }]} numberOfLines={1} ellipsizeMode="tail">
            {isPendingInvite ? 'N/A' : (item.role === 'manager' ? 'N/A' : manager?.full_name || 'N/A')}
        </Text>
        <View style={[styles.tableCellActions, { width: fixedColumnWidths.actions }]}>
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
      <Text style={[styles.tableHeaderCell, { width: fixedColumnWidths.avatar }]}></Text> {/* Avatar column */}
      <Text style={[styles.tableHeaderCell, { flex: 1, minWidth: flexibleColumnMinLengths.name }]} fontType="bold">Name</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1, minWidth: flexibleColumnMinLengths.email }]} fontType="bold">Email</Text>
      <Text style={[styles.tableHeaderCell, { width: fixedColumnWidths.phone }]} fontType="bold">Phone</Text>
      <Text style={[styles.tableHeaderCell, { width: fixedColumnWidths.status }]} fontType="bold">Status</Text>
      <Text style={[styles.tableHeaderCell, { width: fixedColumnWidths.role }]} fontType="bold">Role</Text>
      <Text style={[styles.tableHeaderCell, { width: fixedColumnWidths.joined }]} fontType="bold">Joined</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1, minWidth: flexibleColumnMinLengths.reportingTo }]} fontType="bold">Reporting To</Text>
      <Text style={[styles.tableHeaderCell, { width: fixedColumnWidths.actions }]}></Text> {/* Actions column */}
    </View>
  );

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle} fontType="bold">Team</Text>
        <Text style={styles.pageSubtitle}>Manage your workers and their roles.</Text>
      </View>
      <View style={styles.mainContentCard}>
        <View style={styles.headerControls}>
          <View style={styles.searchAndFilter}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={theme.colors.bodyText}
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
              <Text style={styles.statValue} fontType="bold">{seatsUsed}/{seatLimit}</Text>
              <Text style={styles.statLabel} fontType="regular">Seats Used</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue} fontType="bold">{managerCount}</Text>
              <Text style={styles.statLabel} fontType="regular">Managers</Text>
            </View>
            <Button title="Invite" onPress={handleInvite} style={styles.createButton} textStyle={styles.createButtonText} />
          </View>
        </View>


        <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1, minWidth: minTableContentWidth }}>
          <View style={{ flexGrow: 1 }}>
            <TableHeader />
            {filteredItems.map(renderEmployeeRow)}
          </View>
        </ScrollView>
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
  pageHeader: {
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.background,
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  pageSubtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.bodyText,
  },
  mainContentCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(3), // Add padding within the card
    marginHorizontal: theme.spacing(2), // Match dashboard's column margin
    marginBottom: theme.spacing(2),
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      native: {
        elevation: 6,
      },
    }),
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(3), // Increased margin for better separation
  },
  searchAndFilter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    width: 250, // Adjusted width
    height: 40, // Adjusted height
    backgroundColor: theme.colors.pageBackground, // Lighter background for search input
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    fontSize: theme.fontSizes.md,
    marginRight: theme.spacing(1.5), // Adjusted margin
    color: theme.colors.headingText,
  },
  filterDropdown: {
    width: 130, // Adjusted width
    height: 40, // Adjusted height
    backgroundColor: theme.colors.pageBackground, // Lighter background for dropdown
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(1),
  },
  placeholderStyle: { fontSize: theme.fontSizes.md, color: theme.colors.bodyText },
  selectedTextStyle: { fontSize: theme.fontSizes.md, color: theme.colors.headingText },
  headerStatsAndButton: { flexDirection: 'row', alignItems: 'center' },
  statItem: { alignItems: 'center', marginHorizontal: theme.spacing(1.5) },
  statValue: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
  },
  statLabel: {
    fontSize: theme.fontSizes.sm,
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
  createButtonText: { color: "white", fontSize: 18 },
  // tableWrapperCard removed

  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  tableHeaderCell: {
    padding: theme.spacing(2),
    color: theme.colors.headingText,
    textAlign: 'center',
  },
  // tableHeaderCellAvatar removed
  // tableHeaderCellActions removed
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
  },
  // tableCellAvatar removed
  tableCellText: {
    padding: theme.spacing(2),
    color: theme.colors.bodyText,
    textAlign: 'center',
    fontSize: theme.fontSizes.md,
  },
  tableCellActions: {
    flexDirection: 'row', // Re-added for consistency within actions
    justifyContent: 'space-around', // Re-added for consistency within actions
    alignItems: 'center',
    padding: theme.spacing(1),
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 40,
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