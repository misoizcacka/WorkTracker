import React, { useState, useContext } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, ActivityIndicator, Switch, Platform } from 'react-native';
import { InvitesContext } from '../app/(manager)/InvitesContext';
import { Button } from './Button';
import { theme } from '../theme';

interface InviteWorkerModalProps {
  visible: boolean;
  onClose: () => void;
}

const InviteWorkerModal: React.FC<InviteWorkerModalProps> = ({ visible, onClose }) => {
  const [invitationMethod, setInvitationMethod] = useState<'email' | 'phone'>('email');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const invitesContext = useContext(InvitesContext);

  const handleInvite = async () => {
    if (!fullName) {
      setError('Full name is required.');
      return;
    }
    if (invitationMethod === 'email' && !email) {
      setError('Email is required for email invites.');
      return;
    }
    if (invitationMethod === 'phone' && !phone) {
      setError('Phone number is required for phone invites.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await invitesContext?.addInvite({
        full_name: fullName,
        email,
        phone,
        invitationMethod,
      });
      setLoading(false);
      onClose();
    } catch (e) {
      setLoading(false);
      setError('Failed to send invite. Please try again.');
    }
  };

  const isEmailInvite = invitationMethod === 'email';

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Invite Worker</Text>

          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, isEmailInvite && styles.activeToggle]}>Email</Text>
            <Switch
              value={!isEmailInvite}
              onValueChange={() => setInvitationMethod(isEmailInvite ? 'phone' : 'email')}
              trackColor={{ false: theme.colors.primary, true: theme.colors.primary }}
              thumbColor={theme.colors.cardBackground}
            />
            <Text style={[styles.toggleLabel, !isEmailInvite && styles.activeToggle]}>Phone</Text>
          </View>

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
            placeholder={isEmailInvite ? "Email Address *" : "Email Address (Optional)"}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            placeholder={isEmailInvite ? "Phone Number (Optional)" : "Phone Number *"}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />
          
          <View style={styles.buttonContainer}>
            <Button title="Cancel" onPress={onClose} style={{backgroundColor: theme.colors.accent, marginRight: 10}} textStyle={{color: theme.colors.bodyText}} />
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 10,
  },
  activeToggle: {
    color: theme.colors.primary,
    fontWeight: 'bold',
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
});

export default InviteWorkerModal;
