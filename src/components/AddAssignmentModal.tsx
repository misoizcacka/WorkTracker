import React, { useState, useEffect, useContext } from 'react';
import { Modal, View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import moment from 'moment';
import { Employee } from '~/types';
import { Project } from '../context/ProjectsContext';
import { Assignment } from '../utils/project-assignment-types';
import { generateId } from '../utils/generateId';
import CrossPlatformDatePicker from './CrossPlatformDatePicker';
import CrossPlatformPicker from './CrossPlatformPicker'; // Import CrossPlatformPicker
import { theme } from '~/theme';
import { EmployeesContext } from '~/context/EmployeesContext'; // Import EmployeesContext

interface AddAssignmentModalProps {
  isVisible: boolean;
  onClose: () => void;
  employees: Employee[]; // Changed from workers: Worker[]
  projects: Project[];
  selectedDate: Date;
  onSave: (assignment: Assignment) => void;
  initialProject?: Project;
  initialEmployee?: Employee; // Changed from initialWorker?: Worker
}

const AddAssignmentModal: React.FC<AddAssignmentModalProps> = ({
  isVisible,
  onClose,
  employees, // Changed from workers
  projects,
  selectedDate,
  onSave,
  initialProject,
  initialEmployee, // Changed from initialWorker
}) => {
  const { employees: contextEmployees } = useContext(EmployeesContext)!; // Renamed to avoid conflict
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(initialEmployee?.id || (employees.length > 0 ? employees[0].id : null)); // Use initialEmployee
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProject?.id || (projects.length > 0 ? projects[0].id : null)); // Use initialProject
  const [assignmentStartDate, setAssignmentStartDate] = useState(selectedDate);
  const [assignmentStartTime, setAssignmentStartTime] = useState<string>('09:00'); // Declared startTime as string
  const [assignmentEndTime, setAssignmentEndTime] = useState<string>('17:00'); // Declared endTime as string
  const [notes, setNotes] = useState<string>(''); // Declared notes as string

  useEffect(() => {
    if (initialProject) {
      setSelectedProjectId(initialProject.id);
    } else if (projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [initialProject, projects]);

  useEffect(() => {
    if (initialEmployee) { // Use initialEmployee
      setSelectedWorkerId(initialEmployee.id);
    } else if (employees.length > 0) {
      setSelectedWorkerId(employees[0].id);
    }
  }, [initialEmployee, employees]);

  const handleSave = () => {
    if (!selectedWorkerId || !selectedProjectId) {
      alert('Please select a worker and a project.');
      return;
    }

    let newAssignment: Assignment = {
      id: generateId(),
      workerId: selectedWorkerId,
      projectId: selectedProjectId,
      startDate: moment(assignmentStartDate).set({
        hour: parseInt(assignmentStartTime.split(':')[0]),
        minute: parseInt(assignmentStartTime.split(':')[1]),
      }).toDate(),
      endDate: moment(assignmentStartDate).set({
        hour: parseInt(assignmentEndTime.split(':')[0]),
        minute: parseInt(assignmentEndTime.split(':')[1]),
      }).toDate(),
      notes: notes,
    };
    onSave(newAssignment);
    onClose();
  };

  const renderTimePicker = (timeString: string, onTimeChange: (newTimeString: string) => void) => {
    return (
      <TextInput
        style={styles.input}
        value={timeString}
        onChangeText={(text) => {
          // Basic validation for HH:MM format
          if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(text) || text === '') {
            onTimeChange(text);
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
              options={employees.map(employee => ({ label: employee.full_name, value: employee.id }))}
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
            <CrossPlatformDatePicker date={selectedDate} onDateChange={setAssignmentStartDate} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Start Time:</Text>
            {renderTimePicker(assignmentStartTime, setAssignmentStartTime)}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>End Time:</Text>
            {renderTimePicker(assignmentEndTime, setAssignmentEndTime)}
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