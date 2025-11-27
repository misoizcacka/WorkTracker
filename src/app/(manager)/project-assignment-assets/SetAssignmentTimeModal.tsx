import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { theme } from '../../../theme';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons

interface SetAssignmentTimeModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (assignedTime: string | null, assignmentId?: string | null) => void;
  assignmentId?: string | null;
  initialTime?: string | null;
}

const SetAssignmentTimeModal: React.FC<SetAssignmentTimeModalProps> = ({
  isVisible,
  onClose,
  onSave,
  assignmentId,
  initialTime,
}) => {
  const [timeInput, setTimeInput] = useState<string>('');
  const [useSpecificTime, setUseSpecificTime] = useState<boolean>(false);

  useEffect(() => {
    if (isVisible) {
      if (initialTime) {
        setTimeInput(initialTime);
        setUseSpecificTime(true);
      } else {
        setTimeInput('');
        setUseSpecificTime(false);
      }
    }
  }, [isVisible, initialTime]);

  const handleSave = () => {
    if (useSpecificTime) {
      // Validate HH:MM
      const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(timeInput);
      if (match) {
        onSave(timeInput, assignmentId);
      } else {
        alert('Please enter a valid time in HH:mm format (24-hour).');
        return;
      }
    } else {
      onSave(null, assignmentId);
    }
    onClose();
  };

  const toggleUseSpecificTime = () => setUseSpecificTime(prev => !prev);

  // Optional: auto-add colon after typing 2 digits
  const handleTimeChange = (text: string) => {
    let cleanedText = text.replace(/\D/g, ''); // Remove all non-digit characters
    let formattedText = cleanedText;

    if (cleanedText.length > 2) {
      formattedText = cleanedText.slice(0, 2) + ':' + cleanedText.slice(2);
    }
    if (formattedText.length > 5) { // Limit to HH:MM format
      formattedText = formattedText.slice(0, 5);
    }

    // Apply real-time validation
    let [hoursStr, minutesStr] = formattedText.split(':');
    
    // Validate hours
    if (hoursStr && hoursStr.length === 2) {
      const hours = parseInt(hoursStr, 10);
      if (isNaN(hours) || hours < 0 || hours > 23) {
        hoursStr = '00'; // Reset to 00 if invalid
      }
    } else if (hoursStr && hoursStr.length === 1 && parseInt(hoursStr, 10) > 2) {
      hoursStr = '0' + hoursStr; // Prepend 0 if first digit > 2
    }
    
    // Validate minutes
    if (minutesStr && minutesStr.length === 2) {
      const minutes = parseInt(minutesStr, 10);
      if (isNaN(minutes) || minutes < 0 || minutes > 59) {
        minutesStr = '00'; // Reset to 00 if invalid
      }
    } else if (minutesStr && minutesStr.length === 1 && parseInt(minutesStr, 10) > 5) {
      minutesStr = '0' + minutesStr; // Prepend 0 if first digit > 5
    }

    let finalTime = hoursStr || '';
    if (minutesStr !== undefined) {
      finalTime += ':' + (minutesStr || '');
    }

    setTimeInput(finalTime);
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
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle-outline" size={24} color={theme.colors.bodyText} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Set Assignment Time</Text>

          <TouchableOpacity onPress={toggleUseSpecificTime} style={styles.checkboxContainer}>
            <View style={[styles.checkbox, useSpecificTime && styles.checkboxChecked]}>
              {useSpecificTime && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.label}>Set specific start time</Text>
          </TouchableOpacity>

          {useSpecificTime ? (
            <TextInput
              style={styles.timeInput}
              value={timeInput}
              onChangeText={handleTimeChange}
              placeholder="HH:MM"
              placeholderTextColor={theme.colors.bodyText}
              keyboardType="numeric"
              maxLength={5} // HH:MM
            />
          ) : (
            <Text style={styles.infoText}>
              If no specific time is set, the assignment will be stacked after the previous one.
            </Text>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSave}
            >
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
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.headingText,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.bodyText,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.bodyText,
    marginTop: 5,
    textAlign: 'left',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.sm,
    padding: 10,
    fontSize: 16,
    width: 100,
    textAlign: 'center',
    color: theme.colors.bodyText,
    backgroundColor: theme.colors.accent,
    marginVertical: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Centered
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

export default SetAssignmentTimeModal;
