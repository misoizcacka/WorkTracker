import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { theme } from '~/theme';
import { Ionicons } from '@expo/vector-icons';

interface SetAssignmentTimeModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (startTime: string | null, assignmentId?: string | null) => void;
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
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');

  useEffect(() => {
    if (isVisible) {
      if (initialTime) {
        const [h, m] = initialTime.split(':');
        setHour(h || '');
        setMinute(m || '');
      } else {
        setHour('');
        setMinute('');
      }
    }
  }, [isVisible, initialTime]);

  const handleSave = () => {
    if (hour === '' && minute === '') {
      onSave(null, assignmentId);
      return;
    }

    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);

    if (isNaN(h) || h < 0 || h > 23 || isNaN(m) || m < 0 || m > 59) {
      Alert.alert('Invalid Time', 'Please enter a valid time (HH:MM).');
      return;
    }

    const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onSave(formattedTime, assignmentId);
  };

  const handleClear = () => {
    onSave(null, assignmentId);
  };

  const enforceHH = (t: string) => {
    const n = t.replace(/\D/g, '');
    if (n === '') return setHour('');
    if (parseInt(n) > 23) return;
    setHour(n);
  };

  const enforceMM = (t: string) => {
    const n = t.replace(/\D/g, '');
    if (n === '') return setMinute('');
    if (parseInt(n) > 59) return;
    setMinute(n);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle-outline" size={24} color={theme.colors.bodyText} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Set Arrival Time (Optional)</Text>

          <Text style={styles.infoText}>
            Order defines flow. Set a time only if a specific arrival is critical. 
            If no time is set, the worker goes here after the previous project.
          </Text>

          <View style={styles.timeRow}>
            <TextInput
              value={hour}
              onChangeText={enforceHH}
              maxLength={2}
              keyboardType="numeric"
              style={styles.timeBox}
              placeholder="HH"
              placeholderTextColor={theme.colors.bodyText}
            />
            <Text style={styles.colon}>:</Text>
            <TextInput
              value={minute}
              onChangeText={enforceMM}
              maxLength={2}
              keyboardType="numeric"
              style={styles.timeBox}
              placeholder="MM"
              placeholderTextColor={theme.colors.bodyText}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClear}
            >
              <Text style={[styles.actionButtonText, styles.clearButtonText]}>Clear Time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
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
        borderRadius: theme.radius.lg,
        padding: 25,
        alignItems: 'center',
        width: '90%',
        maxWidth: 340,
      },
      modalTitle: {
        marginBottom: 10,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '600',
        color: theme.colors.headingText,
      },
      infoText: {
        marginBottom: 20,
        textAlign: 'center',
        fontSize: 14,
        color: theme.colors.bodyText,
        paddingHorizontal: 10,
      },
      closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
        padding: 5,
      },
      timeRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
      },
      timeBox: {
        width: 75,
        height: 65,
        backgroundColor: theme.colors.accent,
        borderRadius: theme.radius.md,
        textAlign: 'center',
        fontSize: 30,
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        color: theme.colors.headingText,
      },
      colon: {
        fontSize: 32,
        fontWeight: 'bold',
        marginHorizontal: 10,
        color: theme.colors.headingText,
      },
      buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
      },
      actionButton: {
        paddingVertical: 12,
        borderRadius: theme.radius.md,
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 5,
      },
      saveButton: {
        backgroundColor: theme.colors.primary,
      },
      clearButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.danger,
      },
      actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
      },
      clearButtonText: {
        color: theme.colors.danger,
      }
});

export default SetAssignmentTimeModal;
