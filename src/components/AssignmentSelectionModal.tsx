import React from 'react';
import { Modal, View, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { theme } from '~/theme';
import { Ionicons } from '@expo/vector-icons';
import { ProcessedAssignmentStepWithStatus } from '~/context/AssignmentsContext';
import { Text } from './Themed';
import { Card } from './Card';

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
  const renderItem = ({ item }: { item: ProcessedAssignmentStepWithStatus }) => {
    const ass = item as any;
    return (
      <TouchableOpacity
        style={[
          styles.assignmentItem,
          currentSelectedId === item.id && styles.selectedAssignmentItem,
        ]}
        onPress={() => onSelectAssignment(item.id)}
      >
        <View style={[styles.iconContainer, { backgroundColor: ass.project?.color || theme.colors.primary + '20' }]}>
          <Ionicons 
            name={ass.type === 'project' ? "business-outline" : "pin-outline"} 
            size={20} 
            color={currentSelectedId === item.id ? theme.colors.primary : theme.colors.bodyText} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.assignmentTitle} fontType="bold">
            {ass.type === 'project' ? ass.project?.name : ass.location?.name}
          </Text>
          {ass.type === 'project' && ass.project?.address && (
            <Text style={styles.assignmentAddress} numberOfLines={1}>{ass.project.address}</Text>
          )}
          {ass.start_time && (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color={theme.colors.disabledText} />
              <Text style={styles.assignmentTime}> {ass.start_time}</Text>
            </View>
          )}
        </View>

        {currentSelectedId === item.id ? (
          <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={theme.colors.disabledText} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.centeredView}>
          <Card style={styles.modalView}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle} fontType="bold">Select Assignment</Text>
                <Text style={styles.modalSubtitle}>Choose where you'll be working</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.bodyText} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={assignments} // Removed internal filter to allow all assignments
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              style={styles.assignmentList}
              contentContainerStyle={styles.assignmentListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color={theme.colors.borderColor} />
                  <Text style={styles.emptyListText}>No assignments found for today.</Text>
                </View>
              }
            />
          </Card>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    width: '100%',
    alignItems: 'center',
  },
  modalView: {
    width: '95%',
    maxWidth: 600,
    height: '75%',
    maxHeight: '80%',
    minHeight: 400,
    padding: 0, // Managed by internal views
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing(3),
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  modalTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
  },
  modalSubtitle: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: theme.colors.pageBackground,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignmentList: {
    width: '100%',
  },
  assignmentListContent: {
    paddingBottom: theme.spacing(2),
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(2.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  selectedAssignmentItem: {
    backgroundColor: theme.colors.primary + '05',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(2),
  },
  textContainer: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  assignmentAddress: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  assignmentTime: {
    fontSize: 11,
    color: theme.colors.disabledText,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyListText: {
    color: theme.colors.disabledText,
    marginTop: 12,
    fontSize: theme.fontSizes.sm,
  },
});

export default AssignmentSelectionModal;
