import React, { useState, useEffect } from 'react';
import { Modal, View, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { theme } from '~/theme';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Text } from './Themed';

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
          <Text style={styles.modalTitle} fontType="bold">Set Arrival Time</Text>

          <Text style={styles.infoText} fontType="regular">
            Order defines flow. Set a time only if a specific arrival is critical. 
            If no time is set, the worker goes here after the previous project.
          </Text>

          <View style={styles.timeRow}>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeLabel} fontType="medium">Hour</Text>
              <TextInput
                value={hour}
                onChangeText={enforceHH}
                maxLength={2}
                keyboardType="numeric"
                style={styles.timeBox}
                placeholder="HH"
                placeholderTextColor={theme.colors.disabledText}
              />
            </View>
            <Text style={styles.colon} fontType="bold">:</Text>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeLabel} fontType="medium">Minute</Text>
              <TextInput
                value={minute}
                onChangeText={enforceMM}
                maxLength={2}
                keyboardType="numeric"
                style={styles.timeBox}
                placeholder="MM"
                placeholderTextColor={theme.colors.disabledText}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              onPress={handleClear}
              title="Clear"
              type="secondary"
              style={styles.clearButton}
              textStyle={styles.clearButtonText}
            />
            <Button
              onPress={handleSave}
              title="Save"
              style={styles.saveButton}
              textStyle={styles.saveButtonText}
            />
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
        alignItems: 'flex-end',
        marginBottom: 25,
      },
      timeInputGroup: {
        alignItems: 'center',
      },
      timeLabel: {
        fontSize: 12,
        color: theme.colors.bodyText,
        marginBottom: theme.spacing(1),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      },
      timeBox: {
        width: 72,
        height: 52,
        backgroundColor: theme.colors.pageBackground,
        borderRadius: theme.radius.md,
        textAlign: 'center',
        fontSize: 22,
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        color: theme.colors.headingText,
      },
      colon: {
        fontSize: 24,
        marginHorizontal: 12,
        marginBottom: 10,
        color: theme.colors.headingText,
      },
      buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
        gap: theme.spacing(1.5),
      },
      saveButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: theme.spacing(2),
      },
      clearButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: theme.radius.md,
        paddingVertical: 10,
        paddingHorizontal: theme.spacing(2),
      },
      saveButtonText: {
        fontSize: 15,
      },
      clearButtonText: {
        color: theme.colors.danger,
        fontSize: 15,
      }
});

export default SetAssignmentTimeModal;
