import React from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Button } from './Button';
import { theme } from '../theme';
import { Employee } from '../types';
import { Ionicons } from '@expo/vector-icons';

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
          <Text style={styles.modalText}>Remove Employee</Text>

          <Text style={styles.confirmationText}>
            Are you sure you want to remove {employee?.full_name}? This action cannot be undone.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button onPress={handleConfirm} disabled={loading} style={{flex: 1, backgroundColor: theme.colors.danger}}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Remove</Text>}
            </Button>
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
    backgroundColor: 'white',
    borderRadius: 20,
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
  },
  modalText: {
    marginBottom: 25,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 5,
  },
  confirmationText: {
    marginBottom: 25,
    textAlign: 'center',
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RemovePersonModal;