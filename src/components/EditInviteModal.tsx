import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Button } from './Button';
import { theme } from '../theme';
import { Invite } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';

interface EditInviteModalProps {
  visible: boolean;
  onClose: () => void;
  invite: Invite | null;
  onSave: (invite: Invite) => Promise<void>; // onSave now expects a Promise
  loading: boolean; // Prop to indicate if saving is in progress
}

const EditInviteModal: React.FC<EditInviteModalProps> = ({ visible, onClose, invite, onSave, loading }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'worker' | 'manager'>('worker');
  const [error, setError] = useState('');

  const roleOptions = [
    { label: 'Worker', value: 'worker' },
    { label: 'Manager', value: 'manager' },
  ];

  useEffect(() => {
    if (invite) {
      setFullName(invite.full_name);
      setEmail(invite.email);
      setRole(invite.role);
      setError('');
    }
  }, [invite]);

  const handleSave = async () => {
    if (!fullName || !email || !role) {
      setError('All fields are required.');
      return;
    }
    if (!invite) {
      Alert.alert("Error", "No invite selected for editing.");
      return;
    }

    setError('');
    
    try {
      await onSave({
        ...invite,
        full_name: fullName,
        email: email,
        role: role,
      });
      onClose();
    } catch (e: any) {
      console.error("Failed to save invite changes:", e);
      setError(e.message || 'Failed to save changes. Please try again.');
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
          <Text style={styles.modalText}>Edit Invite</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.formContainer}>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name *"
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor="#999"
                editable={!loading}
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Email Address *"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
                editable={false} // Email should generally not be editable for invites
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Role</Text>
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                data={roleOptions}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select role"
                searchPlaceholder="Search..."
                value={role}
                onChange={item => {
                  setRole(item.value);
                }}
                disable={loading}
              />
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
    top: 15,
    right: 15,
    zIndex: 1,
  },
  formContainer: {
    // flex: 1, // Remove flex 1 here, let content drive size
  },
  fieldRow: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.bodyText,
    marginBottom: 5,
  },
  input: {
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: theme.colors.headingText,
  },
  dropdown: {
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
    color: theme.colors.headingText,
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

export default EditInviteModal;