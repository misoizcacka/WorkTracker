import React, { useState, useContext } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AssignmentStep, AssignmentRecord } from '~/types';
import { theme } from '~/theme';
import { useAssignments } from '~/context/AssignmentsContext';
import { useProjects } from '~/context/ProjectsContext';
import { generateKeyBetween } from '~/utils/fractionalIndexing';
import { SearchableDropdown } from './SearchableDropdown';
import Toast from 'react-native-toast-message';

interface AddAssignmentModalProps {
  isVisible: boolean;
  onClose: () => void;
  workerId: string | null;
  assignedDate: string; // YYYY-MM-DD
}

type AssignmentType = 'project' | 'common_location';

const AddAssignmentModal: React.FC<AddAssignmentModalProps> = ({
  isVisible,
  onClose,
  workerId,
  assignedDate,
}) => {
  const { assignments, insertAssignmentStep, commonLocations } = useAssignments(); // Updated destructuring
  const { projects } = useProjects();
  
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('project');
  const [selectedItem, setSelectedItem] = useState<{label: string, value: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const projectOptions = projects.map(p => ({ label: p.name, value: p.id }));
  const locationOptions = commonLocations.map((l: { name: string; id: string; }) => ({ label: l.name, value: l.id }));

  const handleSave = async () => {
    if (!workerId || !selectedItem) {
      Toast.show({ type: 'error', text1: 'Missing Information', text2: 'Please select a worker and an item to assign.' });
      return;
    }
    setIsLoading(true);

    // Filter assignments for the target worker and date
    const workerAssignmentsForDay = assignments.filter(
        (assign: AssignmentRecord) => assign.worker_id === workerId && assign.assigned_date === assignedDate
    ).sort((a: AssignmentRecord, b: AssignmentRecord) => a.sort_key.localeCompare(b.sort_key)); // Ensure sorted for fractional indexing
    
    // Check for duplicates
    if (workerAssignmentsForDay.some((assign: AssignmentRecord) => assign.ref_id === selectedItem.value)) {
        Toast.show({ type: 'info', text1: 'Assignment Exists', text2: 'This item is already assigned to this worker on this day.' });
        setIsLoading(false);
        return;
    }

    const lastIndex = workerAssignmentsForDay.length > 0 ? workerAssignmentsForDay[workerAssignmentsForDay.length - 1].sort_key : null;
    const newSortKey = generateKeyBetween(lastIndex, null);

    try {
      await insertAssignmentStep({
        worker_id: workerId,
        assigned_date: assignedDate,
        sort_key: newSortKey,
        ref_id: selectedItem.value,
        ref_type: assignmentType,
        start_time: null, // Default to null for new assignments
      });
      Toast.show({ type: 'success', text1: 'Assignment Added' });
      setSelectedItem(null); // Reset for next time
      onClose();
    } catch (error) {
      console.error("Failed to save assignment:", error);
      Toast.show({ type: 'error', text1: 'Save Failed', text2: 'Could not add the new assignment.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectItem = (item: {label: string, value: string} | null) => {
    setSelectedItem(item);
  }

  const currentOptions = assignmentType === 'project' ? projectOptions : locationOptions;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Add Assignment</Text>
          
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleButton, assignmentType === 'project' && styles.toggleButtonActive]} 
              onPress={() => {
                setAssignmentType('project');
                setSelectedItem(null);
              }}
            >
              <Text style={[styles.toggleButtonText, assignmentType === 'project' && styles.toggleButtonTextActive]}>Project</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, assignmentType === 'common_location' && styles.toggleButtonActive]} 
              onPress={() => {
                setAssignmentType('common_location');
                setSelectedItem(null);
              }}
            >
              <Text style={[styles.toggleButtonText, assignmentType === 'common_location' && styles.toggleButtonTextActive]}>Location</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <SearchableDropdown
              data={currentOptions}
              onSelect={handleSelectItem}
              labelExtractor={(item) => item?.label ?? ''}
              keyExtractor={(item) => item?.value ?? ''}
              placeholder={`Search for a ${assignmentType}...`}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={onClose} disabled={isLoading}>
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSave} disabled={!selectedItem || isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    margin: 20,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.headingText,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.bodyText,
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  formGroup: {
    width: '100%',
    marginBottom: 20,
    zIndex: 1000, // For dropdown visibility
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.accent,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  actionButtonText: {
    color: theme.colors.headingText,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddAssignmentModal;