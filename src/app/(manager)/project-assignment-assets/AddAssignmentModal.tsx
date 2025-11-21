import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import moment from 'moment';
import { Worker } from '../../../types';
import { Project } from '../ProjectsContext';
import { Assignment } from './types';
import { generateId } from './utils/generateId';
import CrossPlatformDatePicker from '../../../components/CrossPlatformDatePicker';
import CrossPlatformPicker from '../../../components/CrossPlatformPicker'; // Import CrossPlatformPicker
import { theme } from '../../../theme';

interface AddAssignmentModalProps {
  isVisible: boolean;
  onClose: () => void;
  workers: Worker[];
  projects: Project[];
  selectedDate: Date;
  onSave: (assignment: Assignment) => void;
  initialProject?: Project;
  initialWorker?: Worker;
}

const AddAssignmentModal: React.FC<AddAssignmentModalProps> = ({
  isVisible,
  onClose,
  workers,
  projects,
  selectedDate,
  onSave,
  initialProject,
  initialWorker,
}) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(workers.length > 0 ? workers[0].id : null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects.length > 0 ? projects[0].id : null);
  const [startTime, setStartTime] = useState<Date>(moment(selectedDate).startOf('day').add(9, 'hours').toDate());
  const [endTime, setEndTime] = useState<Date>(moment(selectedDate).startOf('day').add(10, 'hours').toDate());
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isVisible) {
      setSelectedWorkerId(initialWorker?.id || (workers.length > 0 ? workers[0].id : null));
      setSelectedProjectId(initialProject?.id || (projects.length > 0 ? projects[0].id : null));
      setStartTime(moment(selectedDate).startOf('day').add(9, 'hours').toDate());
      setEndTime(moment(selectedDate).startOf('day').add(10, 'hours').toDate());
      setNotes('');
    }
  }, [isVisible, selectedDate, workers, projects, initialProject, initialWorker]);

  const handleSave = () => {
    if (!selectedWorkerId || !selectedProjectId) {
      alert('Please select a worker and a project.');
      return;
    }

    let newAssignment: Assignment = {
      id: generateId(),
      workerId: selectedWorkerId,
      projectId: selectedProjectId,
      startDate: startTime,
      endDate: endTime,
      notes,
    };
    onSave(newAssignment);
    onClose();
  };

  const renderTimePicker = (time: Date, onTimeChange: (newTime: Date) => void) => {
    const timeString = moment(time).format('HH:mm');
    return (
      <TextInput
        style={styles.input}
        value={timeString}
        onChangeText={(text) => {
          const [hours, minutes] = text.split(':').map(Number);
          if (!isNaN(hours) && !isNaN(minutes)) {
            const newTime = moment(time).hours(hours).minutes(minutes).toDate();
            onTimeChange(newTime);
          }
        }}
        keyboardType="numbers-and-punctuation"
        placeholder="HH:MM"
      />
    );
  };

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

          <View style={styles.formGroup}>
            <Text style={styles.label}>Worker:</Text>
            <CrossPlatformPicker
              selectedValue={selectedWorkerId}
              onValueChange={(itemValue: string | null) => setSelectedWorkerId(itemValue)}
              options={workers.map(worker => ({ label: worker.full_name, value: worker.id }))}
              placeholder="Select Worker"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Project:</Text>
            <CrossPlatformPicker
              selectedValue={selectedProjectId}
              onValueChange={(itemValue: string | null) => setSelectedProjectId(itemValue)}
              options={projects.map(project => ({ label: project.name, value: project.id }))}
              placeholder="Select Project"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Date:</Text>
            <CrossPlatformDatePicker date={selectedDate} onDateChange={() => {}} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Start Time:</Text>
            {renderTimePicker(startTime, setStartTime)}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>End Time:</Text>
            {renderTimePicker(endTime, setEndTime)}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes:</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.danger }]} onPress={onClose}>
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
              <Text style={styles.actionButtonText}>Save</Text>
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
    borderRadius: theme.radius.sm,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
    maxWidth: 500,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.headingText,
  },
  formGroup: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
    color: theme.colors.bodyText,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.sm,
    padding: 10,
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  picker: {
    height: 50,
    width: '100%',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    color: theme.colors.bodyText,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.radius.sm,
    minWidth: 100,
    alignItems: 'center',
  },
  actionButtonText: {
    color: theme.colors.pageBackground,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddAssignmentModal;