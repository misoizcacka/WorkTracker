import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Switch, useWindowDimensions, Image, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as ImagePicker from 'expo-image-picker';
import { MediaType } from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { theme } from "../../theme";
import AnimatedScreen from "../../components/AnimatedScreen";
import { useSession } from "../../context/AuthContext";
import { useProfile } from "../../context/ProfileContext"; // NEW
import { setStorageItemAsync, useStorageState } from "../../hooks/useStorageState";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LanguageSelector } from "../../components/LanguageSelector";
import { uploadAvatar, updateEmployeeProfile, getAvatarPublicUrl } from "../../services/profile"; // NEW

export default function ManagerAccount() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;
  const { signOut, user } = useSession()!;
  const { profile, isLoading: isProfileLoading, refetchProfile } = useProfile(); // NEW
  const router = useRouter();

  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [[, isBiometricEnabled], setIsBiometricEnabled] = useStorageState('biometricEnabled');
  
  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
    })();
  }, []);

  const handleBiometricSwitch = async (value: boolean) => {
    if (value) {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (enrolled) {
        const result = await LocalAuthentication.authenticateAsync();
        if (result.success) {
          await setStorageItemAsync('biometricUser', JSON.stringify({ email: user?.email }));
          setIsBiometricEnabled('true');
        }
      } else {
        alert("No biometrics are enrolled on this device.");
      }
    } else {
      await setStorageItemAsync('biometricUser', null);
      setIsBiometricEnabled(null);
    }
  };

  const handleImagePickAndUpload = async () => {
    if (!user?.id) {
        Alert.alert("Error", "User not logged in.");
        return;
    }

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
        const storagePath = await uploadAvatar(user.id, localUri);
        
        // Update the employee's avatar_url in the database
        await updateEmployeeProfile(user.id, { avatar_url: storagePath });
        
        // Refresh the profile data to update the UI
        await refetchProfile();
        Toast.show({ type: 'success', text1: 'Avatar Updated' });

      } catch (error: any) {
        console.error("Error uploading avatar:", error);
        Alert.alert("Upload Failed", error.message || "Failed to upload avatar.");
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleSaveProfileChanges = async () => {
    if (!user?.id || !profile) {
        Alert.alert("Error", "User not logged in or profile not loaded.");
        return;
    }
    if (name === profile.full_name && phone === profile.phone) {
        Toast.show({ type: 'info', text1: 'No Changes', text2: 'No profile changes to save.' });
        return;
    }

    setIsSavingProfile(true);
    try {
        await updateEmployeeProfile(user.id, { full_name: name, phone: phone });
        await refetchProfile();
        Toast.show({ type: 'success', text1: 'Profile Saved', text2: 'Your profile details have been updated.' });
    } catch (error: any) {
        console.error("Error saving profile changes:", error);
        Alert.alert("Save Failed", error.message || "Failed to save profile changes.");
    } finally {
        setIsSavingProfile(false);
    }
  };

  const layoutStyle = isLargeScreen ? styles.desktopLayout : styles.mobileLayout;

  if (isProfileLoading) {
    return (
      <AnimatedScreen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{color: theme.colors.bodyText, marginTop: theme.spacing(2)}}>Loading profile...</Text>
        </View>
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>My Account</Text>
        
        <View style={layoutStyle}>
            <View style={styles.column}>
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>User Profile</Text>
                    <View style={styles.profileHeader}>
                        <Image source={{ uri: profile?.public_avatar_url || 'https://i.pravatar.cc/150?u=manager' }} style={styles.avatar} />
                        <View style={{flex: 1}}>
                            <Text style={styles.name}>{profile?.full_name}</Text>
                            <Text style={styles.email}>{user?.email}</Text>
                            <TouchableOpacity style={styles.uploadButton} onPress={handleImagePickAndUpload} disabled={isUploadingAvatar}>
                                {isUploadingAvatar ? (
                                    <ActivityIndicator color={theme.colors.primary} />
                                ) : (
                                    <>
                                        <Ionicons name="camera-outline" size={16} color={theme.colors.primary} />
                                        <Text style={styles.uploadButtonText}>Upload Picture</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput 
                            style={styles.input} 
                            value={name} 
                            onChangeText={setName} 
                            placeholder="Full Name"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput 
                            style={styles.input} 
                            value={phone} 
                            onChangeText={setPhone} 
                            keyboardType="phone-pad" 
                            placeholder="Phone Number"
                        />
                    </View>
                    <Button 
                        title="Save Profile Changes" 
                        onPress={handleSaveProfileChanges} 
                        disabled={isSavingProfile || isProfileLoading || isUploadingAvatar} 
                        style={styles.saveButton}
                        textStyle={styles.saveButtonText}
                    >
                        {isSavingProfile ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                    </Button>
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>Security</Text>
                    {isBiometricSupported && (
                        <View style={styles.settingRow}>
                            <Ionicons name="finger-print-outline" size={24} color={theme.colors.bodyText} />
                            <Text style={styles.settingLabel}>Enable Biometric Login</Text>
                            <Switch value={isBiometricEnabled === 'true'} onValueChange={handleBiometricSwitch} trackColor={{false: theme.colors.borderColor, true: theme.colors.primary}}/>
                        </View>
                    )}
                    <View style={styles.settingRow}>
                         <Ionicons name="lock-closed-outline" size={24} color={theme.colors.bodyText} />
                        <Text style={styles.settingLabel}>Change Password</Text>
                        <Button title="Change" style={styles.inlineButton} textStyle={styles.inlineButtonText} />
                    </View>
                </Card>

            </View>

            <View style={styles.column}>
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>Subscription Details</Text>
                    <View style={styles.settingRow}>
                        <Ionicons name="ribbon-outline" size={24} color={theme.colors.bodyText} />
                        <Text style={styles.settingLabel}>Current Plan</Text>
                        <Text style={styles.planText}>Pro Plan</Text>
                    </View>
                     <View style={styles.settingRow}>
                        <Ionicons name="people-outline" size={24} color={theme.colors.bodyText} />
                        <Text style={styles.planText}>7 / 10</Text>
                    </View>
                    <Button title="Manage Subscription" onPress={() => router.push('/(manager)/subscription/manage-subscription')} style={{marginTop: theme.spacing(2)}} />
                </Card>
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>Language</Text>
                    <LanguageSelector />
                </Card>
                <Button title="Log Out" onPress={() => signOut()} style={styles.logoutButton} textStyle={{fontWeight: 'bold'}}/>
            </View>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
  },
  container: { flex: 1, backgroundColor: theme.colors.pageBackground },
  scrollContentContainer: { padding: theme.spacing(3) },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.headingText, marginBottom: theme.spacing(3) },
  desktopLayout: { flexDirection: 'row' },
  mobileLayout: { flexDirection: 'column' },
  column: { flex: 1, marginHorizontal: theme.spacing(1) },
  card: { marginBottom: theme.spacing(2) },
  cardTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.headingText, marginBottom: theme.spacing(2) },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing(2) },
  avatar: { width: 80, height: 80, borderRadius: 40, marginRight: theme.spacing(2) },
  name: { fontSize: 22, fontWeight: 'bold', color: theme.colors.headingText },
  email: { fontSize: 14, color: theme.colors.bodyText, marginBottom: theme.spacing(1) },
  uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.pageBackground, paddingVertical: 4, paddingHorizontal: 8, borderRadius: theme.radius.md, alignSelf: 'flex-start' },
  uploadButtonText: { color: theme.colors.primary, marginLeft: 4, fontWeight: '500' },
  inputGroup: { marginBottom: theme.spacing(1.5) },
  label: { fontSize: 14, color: theme.colors.bodyText, marginBottom: 4 },
  input: { height: 45, borderColor: theme.colors.borderColor, borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 10, backgroundColor: theme.colors.pageBackground, fontSize: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing(1) },
  settingLabel: { flex: 1, fontSize: 16, marginLeft: theme.spacing(1.5) },
  inlineButton: { paddingHorizontal: 16, paddingVertical: 8, height: 'auto' },
  inlineButtonText: { fontSize: 14 },
  planText: { fontSize: 16, fontWeight: '600' },
  logoutButton: { backgroundColor: theme.colors.danger, marginTop: theme.spacing(1) },
  saveButton: { backgroundColor: theme.colors.primary, marginTop: theme.spacing(2) },
  saveButtonText: { color: 'white', fontWeight: 'bold' }
});