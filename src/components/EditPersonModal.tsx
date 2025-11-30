import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Button } from './Button';
import { theme } from '../theme';
import { Worker } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';

interface EditPersonModalProps {
  visible: boolean;
  onClose: () => void;
  worker: Worker | null;
  onSave: (worker: Worker) => void;
  allWorkers: Worker[];
}

const EditPersonModal: React.FC<EditPersonModalProps> = ({ visible, onClose, worker, onSave, allWorkers }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reportingTo, setReportingTo] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const managers = allWorkers.filter(w => w.role === 'manager');

  useEffect(() => {
    if (worker) {
      setFullName(worker.full_name);
      setEmail(worker.email || '');
      setPhone(worker.phone_number || '');
      setReportingTo(worker.reporting_to);
    }
  }, [worker]);

  const handleSave = async () => {
    if (!fullName) {
      setError('Full name is required.');
      return;
    }
    if (!worker) {
      return;
    }

    setError('');
    setLoading(true);
    try {
      onSave({
        ...worker,
        full_name: fullName,
        email,
        phone_number: phone,
        reporting_to: reportingTo,
      });
      setLoading(false);
      onClose();
    } catch (e) {
      setLoading(false);
      setError('Failed to save changes. Please try again.');
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
            <Ionicons name="close-circle-outline" size={30} color={theme.colors.bodyText} />
          </TouchableOpacity>
          <Text style={styles.modalText}>Edit Details</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.contentLayout}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: worker?.avatar }} style={styles.avatar} />
              <TouchableOpacity style={styles.avatarEditButton}>
                <Ionicons name="pencil" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name *"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>
              {worker?.role === 'worker' && (
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Reports to</Text>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    inputSearchStyle={styles.inputSearchStyle}
                    iconStyle={styles.iconStyle}
                    data={managers.map(m => ({ label: m.full_name, value: m.id }))}
                    search
                    maxHeight={300}
                    labelField="label"
                    valueField="value"
                    placeholder="Select manager"
                    searchPlaceholder="Search..."
                    value={reportingTo}
                    onChange={item => {
                      setReportingTo(item.value);
                    }}
                  />
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <Button onPress={handleSave} disabled={loading} style={styles.saveButton}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 600,
  },
  modalText: {
    marginBottom: 25,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  contentLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 15,
    padding: 5,
  },
  formContainer: {
    flex: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  label: {
    width: 80,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.bodyText,
  },
  input: {
    flex: 1,
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  dropdown: {
    flex: 1,
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center'
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#999',
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
});

export default EditPersonModal;
