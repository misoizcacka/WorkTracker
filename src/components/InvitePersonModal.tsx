import React, { useState, useContext, useEffect } from 'react';
import { Modal, View, TextInput, StyleSheet, TouchableOpacity, Platform, Share } from 'react-native';
import { InvitesContext } from '../context/InvitesContext';
import { Button } from './Button';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import Toast from 'react-native-toast-message';
import { Text } from './Themed';
import { Invite } from '../types';
import { useSession } from '../context/AuthContext';

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
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<Invite | null>(null);

  const invitesContext = useContext(InvitesContext);
  const { userRole } = useSession();
  const isOwner = userRole === 'owner';

  // Reset form state when the modal is closed
  useEffect(() => {
    if (!visible) {
      setFullName('');
      setEmail('');
      setRole('worker');
      setError('');
      setLoading(false);
      setGeneratedLink('');
      setGeneratedInvite(null);
    }
  }, [visible]);

  const validateInviteForm = () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (trimmedName.length < 2) {
      return 'Please enter a valid full name.';
    }

    if (role === 'manager' && !isOwner) {
      return 'Only owners can invite managers.';
    }

    if (role === 'manager' && !emailPattern.test(trimmedEmail)) {
      return 'Please enter a valid manager email address.';
    }

    return null;
  };

  const handleShareLink = async () => {
    if (!generatedLink) {
      return;
    }

    try {
      if (Platform.OS === 'web' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedLink);
        Toast.show({
          type: 'success',
          text1: 'Link Copied',
          text2: 'The invite link is ready to send to the worker.'
        });
        return;
      }

      await Share.share({
        message: generatedLink,
        url: generatedLink,
      });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Share Failed',
        text2: 'Could not copy or share the invite link.'
      });
    }
  };

  const handleInvite = async () => {
    const validationError = validateInviteForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await invitesContext?.createInvite({
        full_name: fullName.trim(),
        email: role === 'manager' ? email.trim().toLowerCase() : undefined,
        role,
      });

      if (!result?.inviteLink) {
        throw new Error('Invite link was not returned.');
      }

      setGeneratedLink(result.inviteLink);
      setGeneratedInvite(result.invite);

      Toast.show({
        type: 'success',
        text1: 'Invite Ready',
        text2: `Share the access link or invite code with ${fullName.trim()}.`
      });
    } catch (e: any) {
      console.error('InvitePersonModal: failed to create invite', e);
      setError('We could not generate the invite link. Please try again.');
      Toast.show({
        type: 'error',
        text1: 'Invite Failed',
        text2: 'We could not generate the invite link. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // ... (rest of the component is the same)
  const roleOptions = isOwner
    ? [
        { label: 'Worker', value: 'worker' },
        { label: 'Manager', value: 'manager' },
      ]
    : [{ label: 'Worker', value: 'worker' }];

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
          <Text style={styles.modalText}>{generatedLink ? 'Invite Link Ready' : 'Generate Invite'}</Text>

          {generatedLink ? (
            <>
              <Text style={styles.successText}>
                Share this link or have the worker enter the code below inside the app.
              </Text>
              {generatedInvite?.invite_code ? (
                <View style={styles.codeCard}>
                  <Text style={styles.codeLabel} fontType="bold">Invite Code</Text>
                  <Text style={styles.codeValue} fontType="bold">{generatedInvite.invite_code}</Text>
                </View>
              ) : null}
              <TextInput
                style={[styles.input, styles.linkInput]}
                value={generatedLink}
                editable={false}
                multiline
              />
              <View style={styles.buttonContainer}>
                <Button
                  onPress={handleShareLink}
                  title={Platform.OS === 'web' ? 'Copy Link' : 'Share Link'}
                  style={styles.primaryButton}
                  textStyle={styles.primaryButtonText}
                />
              </View>
              <View style={styles.buttonContainer}>
                <Button
                  onPress={onClose}
                  title="Done"
                  type="secondary"
                  style={styles.secondaryButton}
                  textStyle={styles.secondaryButtonText}
                />
              </View>
            </>
          ) : (
            <>
              {error && <Text style={styles.errorText}>{error}</Text>}

              <TextInput
                style={styles.input}
                placeholder="Full Name *"
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor={theme.colors.bodyText}
              />
              {isOwner ? (
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
                    const nextRole = item.value as 'worker' | 'manager';
                    setRole(nextRole);
                    if (nextRole === 'worker') {
                      setEmail('');
                    }
                  }}
                />
              ) : (
                <View style={styles.roleNotice}>
                  <Text style={styles.roleNoticeText} fontType="regular">Managers can invite workers only.</Text>
                </View>
              )}

              {role === 'manager' ? (
                <TextInput
                  style={styles.input}
                  placeholder="Manager Email *"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={theme.colors.bodyText}
                />
              ) : null}
              
              <View style={styles.buttonContainer}>
                <Button
                  onPress={handleInvite}
                  disabled={loading}
                  loading={loading}
                  title="Generate Invite"
                  style={styles.primaryButton}
                  textStyle={styles.primaryButtonText}
                />
              </View>
            </>
          )}
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
    backgroundColor: theme.colors.cardBackground, // Changed from 'white'
    borderRadius: theme.radius.lg, // Changed from 20
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
    borderColor: theme.colors.borderColor, // Added
    borderWidth: 1, // Added
  },
  modalText: {
    marginBottom: theme.spacing(3), // Changed from 25
    textAlign: 'center',
    fontSize: theme.fontSizes.xl, // Changed from 24
    fontWeight: 'bold', // Kept as fontWeight for now
    color: theme.colors.headingText, // Added
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
    height: theme.spacing(6), // Changed from 50
    borderColor: theme.colors.borderColor, // Changed from '#ddd'
    borderWidth: 1,
    borderRadius: theme.radius.md, // Changed from 10
    paddingHorizontal: theme.spacing(3), // Changed from 15
    marginBottom: theme.spacing(2), // Changed from 15
    fontSize: theme.fontSizes.md, // Changed from 16
    color: theme.colors.bodyText, // Ensure text color is readable
  },
  buttonContainer: {
    width: '100%',
    marginTop: theme.spacing(2), // Changed from 10
  },
  successText: {
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(2),
  },
  codeCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
    backgroundColor: theme.colors.pageBackground,
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  codeLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: theme.spacing(0.5),
  },
  codeValue: {
    fontSize: 24,
    letterSpacing: 3,
    color: theme.colors.headingText,
  },
  primaryButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: theme.radius.lg,
  },
  primaryButtonText: {
    fontSize: theme.fontSizes.md,
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: theme.spacing(2), // Changed from 10
    textAlign: 'center',
  },
  linkInput: {
    minHeight: 90,
    textAlignVertical: 'top',
    paddingVertical: theme.spacing(2),
  },
  secondaryButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.pageBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.md,
  },
  dropdown: {
    width: '100%',
    height: theme.spacing(6), // Changed from 50
    borderColor: theme.colors.borderColor, // Changed from '#ddd'
    borderWidth: 1,
    borderRadius: theme.radius.md, // Changed from 10
    paddingHorizontal: theme.spacing(3), // Changed from 15
    marginBottom: theme.spacing(2), // Changed from 15
    backgroundColor: theme.colors.pageBackground, // Changed from 'white'
  },
  placeholderStyle: {
    fontSize: theme.fontSizes.md, // Changed from 16
    color: theme.colors.bodyText, // Ensure placeholder color is readable
  },
  selectedTextStyle: {
    fontSize: theme.fontSizes.md, // Changed from 16
    color: theme.colors.headingText, // Ensure selected text color is readable
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  roleNotice: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
    backgroundColor: theme.colors.pageBackground,
  },
  roleNoticeText: {
    color: theme.colors.bodyText,
    fontSize: theme.fontSizes.sm,
  },
});

export default InvitePersonModal;
