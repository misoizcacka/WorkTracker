import React, { useState, useContext, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { InvitesContext } from '../context/InvitesContext';
import { Button } from './Button';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import Toast from 'react-native-toast-message';

interface InvitePersonModalProps {
  visible: boolean;
  onClose: () => void;
}

const InvitePersonModal: React.FC<InvitePersonModalProps> = ({ visible, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'worker' | 'manager'>('worker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const invitesContext = useContext(InvitesContext);

  // Reset form state when the modal is closed
  useEffect(() => {
    if (!visible) {
      setFullName('');
      setEmail('');
      setRole('worker');
      setError('');
      setLoading(false);
    }
  }, [visible]);

  const handleInvite = async () => {
    if (!fullName || !email) {
      setError('Full name and email are required.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await invitesContext?.sendEmailInvite({
        full_name: fullName,
        email,
        role,
      });
      
      Toast.show({
        type: 'success',
        text1: 'Invite Sent',
        text2: `An invitation has been sent to ${email}.`
      });
      
      onClose(); // Close modal on success
    } catch (e) {
      setError('Failed to send invite. Please try again.');
      Toast.show({
        type: 'error',
        text1: 'Invite Failed',
        text2: 'Could not send an invitation. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // ... (rest of the component is the same)
  const roleOptions = [
    { label: 'Worker', value: 'worker' },
    { label: 'Manager', value: 'manager' },
  ];

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
          <Text style={styles.modalText}>Invite Worker</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Full Name *"
            value={fullName}
            onChangeText={setFullName}
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            placeholder="Email Address *"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            iconStyle={styles.iconStyle}
            data={roleOptions}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Select Role"
            value={role}
            onChange={item => {
              setRole(item.value as 'worker' | 'manager');
            }}
          />
          
          <View style={styles.buttonContainer}>
            <Button onPress={handleInvite} disabled={loading} style={{flex: 1}}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Invite</Text>}
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
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
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
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  dropdown: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: 'white',
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
});

export default InvitePersonModal;