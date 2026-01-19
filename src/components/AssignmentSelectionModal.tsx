import React from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { theme } from '~/theme';
import { Ionicons } from '@expo/vector-icons';
import { ProcessedAssignmentStepWithStatus } from '~/context/AssignmentsContext'; // Adjust import path as necessary

interface AssignmentSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  assignments: ProcessedAssignmentStepWithStatus[];
  onSelectAssignment: (assignmentId: string) => void;
  currentSelectedId: string | null;
}

const AssignmentSelectionModal: React.FC<AssignmentSelectionModalProps> = ({
  isVisible,
  onClose,
  assignments,
  onSelectAssignment,
  currentSelectedId,
}) => {
  const renderItem = ({ item }: { item: ProcessedAssignmentStepWithStatus }) => (
    <TouchableOpacity
      style={[
        styles.assignmentItem,
        currentSelectedId === item.id && styles.selectedAssignmentItem,
      ]}
      onPress={() => onSelectAssignment(item.id)}
    >
      <View style={[styles.colorIndicator, { backgroundColor: item.type === 'project' && item.project ? item.project.color : theme.colors.primary }]} />
      <View style={styles.textContainer}>
        <Text style={styles.assignmentTitle}>{item.type === 'project' ? item.project?.name : item.location?.name}</Text>
        {item.type === 'project' && item.project?.address && (
          <Text style={styles.assignmentAddress}>{item.project.address}</Text>
        )}
        {item.start_time && (
          <Text style={styles.assignmentTime}>Scheduled: {item.start_time}</Text>
        )}
      </View>
      {currentSelectedId === item.id && (
        <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Assignment</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={30} color={theme.colors.bodyText} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={assignments.filter(assign => assign.status !== 'completed')} // Only show non-completed assignments
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.assignmentList}
            contentContainerStyle={styles.assignmentListContent}
            ListEmptyComponent={
              <Text style={styles.emptyListText}>No upcoming assignments.</Text>
            }
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: theme.spacing(2),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    width: '90%',
    maxHeight: '80%',
    ...theme.shadow.soft,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  closeButton: {
    padding: theme.spacing(1),
  },
  assignmentList: {
    width: '100%',
  },
  assignmentListContent: {
    paddingVertical: theme.spacing(1),
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  selectedAssignmentItem: {
    backgroundColor: theme.colors.accent,
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: theme.spacing(1.5),
  },
  textContainer: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.headingText,
  },
  assignmentAddress: {
    fontSize: 13,
    color: theme.colors.bodyText,
    marginTop: theme.spacing(0.5),
  },
  assignmentTime: {
    fontSize: 13,
    color: theme.colors.bodyText,
    marginTop: theme.spacing(0.5),
    fontWeight: '500',
  },
  emptyListText: {
    textAlign: 'center',
    color: theme.colors.bodyText,
    marginTop: theme.spacing(3),
    fontSize: 16,
  },
});

export default AssignmentSelectionModal;
