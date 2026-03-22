import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Button } from './Button';
import { theme } from '../theme';
import { Employee } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Themed';

interface RemovePersonModalProps {
  visible: boolean;
  onClose: () => void;
  employee: Employee | null;
  onConfirm: (employee: Employee) => void;
  loading: boolean;
}

const RemovePersonModal: React.FC<RemovePersonModalProps> = ({ visible, onClose, employee, onConfirm, loading }) => {
  const handleConfirm = () => {
    if (employee) {
      onConfirm(employee);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle-outline" size={24} color={theme.colors.bodyText} />
          </TouchableOpacity>
          <Text style={styles.modalText} fontType="bold">Remove Employee</Text>

          <Text style={styles.confirmationText} fontType="regular">
            Are you sure you want to remove {employee?.full_name}? This action cannot be undone.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button
              onPress={handleConfirm}
              disabled={loading}
              loading={loading}
              title="Remove Employee"
              type="danger"
              style={styles.dangerButton}
              textStyle={styles.dangerButtonText}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
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
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  modalText: {
    marginBottom: theme.spacing(3),
    textAlign: 'center',
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 5,
  },
  confirmationText: {
    marginBottom: theme.spacing(3),
    textAlign: 'center',
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  buttonContainer: {
    width: '100%',
    marginTop: theme.spacing(2),
  },
  dangerButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: theme.radius.lg,
  },
  dangerButtonText: {
    fontSize: theme.fontSizes.md,
  },
});

export default RemovePersonModal;
