import React, { useState, useEffect } from 'react';
import { Modal, View, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { Button } from './Button';
import { theme } from '../theme';
import { Employee } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { Text } from './Themed';
import { Card } from './Card';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar } from '../services/profile';
import UserAvatar from './UserAvatar';
import Toast from 'react-native-toast-message';
import { useSession } from '~/context/AuthContext';

interface EditPersonModalProps {
  visible: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSave: (employee: Employee) => void;
  allEmployees: Employee[];
}

const EditPersonModal: React.FC<EditPersonModalProps> = ({ visible, onClose, employee, onSave, allEmployees }) => {
  const { userRole } = useSession();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reportingTo, setReportingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const supervisors = allEmployees.filter(
    (e) => (e.role === 'manager' || e.role === 'owner') && e.id !== employee?.id
  );

  useEffect(() => {
    if (employee) {
      setFullName(employee.full_name);
      setEmail(employee.email || '');
      setPhone(employee.phone_number || '');
      setReportingTo(employee.reporting_to);
      setAvatarUrl(employee.avatar_url);
    }
  }, [employee]);

  const validatePersonForm = () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^[0-9+\-()\/\s]*$/;

    if (trimmedName.length < 2) {
      return 'Please enter a valid full name.';
    }

    if (!emailPattern.test(trimmedEmail)) {
      return 'Please enter a valid email address.';
    }

    if (trimmedPhone && !phonePattern.test(trimmedPhone)) {
      return 'Please enter a valid phone number.';
    }

    return null;
  };

  const handleImagePickAndUpload = async () => {
    if (!employee) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIsUploadingAvatar(true);
      try {
        const localUri = result.assets[0].uri;
        const storagePath = await uploadAvatar(employee.id, localUri);
        setAvatarUrl(storagePath);
      } catch (error: any) {
        console.error("Error uploading avatar:", error);
        Alert.alert("Upload Failed", error.message || "Failed to upload avatar.");
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleSave = async () => {
    const validationError = validatePersonForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!employee) {
      return;
    }

    setError('');
    setLoading(true);
    try {
      await onSave({
        ...employee,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phone.trim() || null,
        reporting_to: reportingTo,
        avatar_url: avatarUrl,
      });
      setLoading(false);
      onClose();
    } catch (e: any) {
      setLoading(false);
      Toast.show({
        type: 'error',
        text1: 'Could Not Save Changes',
        text2: e?.message || 'Please try again.'
      });
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Card style={styles.modalView}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle} fontType="bold">Edit Employee</Text>
                <Text style={styles.modalSubtitle}>Update profile and role details</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.bodyText} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <View style={styles.avatarSection}>
                <View style={styles.avatarWrapper}>
                  <UserAvatar 
                    avatarUrl={avatarUrl} 
                    size={90} 
                    style={styles.avatar} 
                  />
                  <TouchableOpacity 
                    style={styles.avatarEditButton} 
                    onPress={handleImagePickAndUpload}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="camera" size={16} color="white" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label} fontType="bold">Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter full name"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholderTextColor={theme.colors.disabledText}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label} fontType="bold">Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email address"
                    value={email}
                    onChangeText={setEmail}
                    editable={userRole === 'owner'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={theme.colors.disabledText}
                  />
                  {userRole !== 'owner' && (
                    <Text style={styles.fieldHint}>Only owners can change employee email addresses.</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label} fontType="bold">Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.colors.disabledText}
                  />
                </View>

                {employee?.role === 'worker' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label} fontType="bold">Reporting To</Text>
                    <Dropdown
                      style={styles.dropdown}
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
                      inputSearchStyle={styles.inputSearchStyle}
                      iconStyle={styles.iconStyle}
                      data={supervisors.map(person => ({ label: person.full_name, value: person.id }))}
                      search
                      maxHeight={300}
                      labelField="label"
                      valueField="value"
                      placeholder="Select supervisor"
                      searchPlaceholder="Search..."
                      value={reportingTo}
                      onChange={item => setReportingTo(item.value)}
                    />
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.footer}>
              <Button 
                onPress={handleSave} 
                disabled={loading || isUploadingAvatar} 
                style={styles.saveButton}
                title="Save Changes"
                loading={loading}
              />
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 550,
  },
  modalView: {
    padding: 0,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.cardBackground,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  modalTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
  },
  modalSubtitle: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: theme.colors.pageBackground,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing(3),
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.pageBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  form: {
    gap: theme.spacing(2),
  },
  inputGroup: {
    marginBottom: theme.spacing(1),
  },
  label: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(1),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    fontSize: 16,
    color: theme.colors.headingText,
  },
  dropdown: {
    height: 48,
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  footer: {
    padding: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: theme.radius.lg,
  },
  placeholderStyle: {
    fontSize: 16,
    color: theme.colors.disabledText,
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
  fieldHint: {
    fontSize: 12,
    color: theme.colors.disabledText,
    marginTop: 6,
  },
});

export default EditPersonModal;
