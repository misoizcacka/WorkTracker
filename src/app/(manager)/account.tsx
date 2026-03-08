import React, { useState, useEffect } from "react";
import { View, StyleSheet, useWindowDimensions, Image, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { Text } from "../../components/Themed";
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { theme } from "../../theme";
import AnimatedScreen from "../../components/AnimatedScreen";
import { useSession } from "../../context/AuthContext";
import { useProfile } from "../../context/ProfileContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LanguageSelector } from "../../components/LanguageSelector";
import { uploadAvatar, updateEmployeeProfile } from "../../services/profile";

export default function ManagerAccount() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;
  const { signOut, user } = useSession()!;
  const { profile, isLoading: isProfileLoading, refetchProfile } = useProfile();
  const router = useRouter();

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
        await updateEmployeeProfile(user.id, { avatar_url: storagePath });
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

  if (isProfileLoading) {
    return (
      <AnimatedScreen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText} fontType="regular">Loading profile...</Text>
        </View>
      </AnimatedScreen>
    );
  }

  const roleLabel = profile?.role ? profile.role.toUpperCase() : 'MANAGER';

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle} fontType="bold">My Account</Text>
        <Text style={styles.pageSubtitle}>Manage your profile, settings, and subscription.</Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        
        <View style={isLargeScreen ? styles.desktopLayout : styles.mobileLayout}>
            {/* Left Column */}
            <View style={styles.column}>
                <Card style={styles.sectionCard}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.sectionTitle} fontType="bold">User Profile</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText} fontType="bold">{roleLabel}</Text>
                        </View>
                    </View>

                    <View style={styles.profileHeader}>
                        <View style={styles.avatarWrapper}>
                            {profile?.public_avatar_url ? (
                              <Image source={{ uri: profile.public_avatar_url }} style={styles.avatar} />
                            ) : (
                              <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={40} color={theme.colors.bodyText} />
                              </View>
                            )}
                            <TouchableOpacity style={styles.editAvatarButton} onPress={handleImagePickAndUpload} disabled={isUploadingAvatar}>
                                {isUploadingAvatar ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="camera" size={16} color="white" />}
                            </TouchableOpacity>
                        </View>
                        <View style={styles.profileMainInfo}>
                            <Text style={styles.userName} fontType="bold">{profile?.full_name}</Text>
                            <Text style={styles.userEmail} fontType="regular">{user?.email}</Text>
                        </View>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label} fontType="bold">Full Name</Text>
                            <TextInput 
                                style={styles.input} 
                                value={name} 
                                onChangeText={setName} 
                                placeholder="Enter your full name"
                                placeholderTextColor={theme.colors.disabledText}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label} fontType="bold">Phone Number</Text>
                            <TextInput 
                                style={styles.input} 
                                value={phone} 
                                onChangeText={setPhone} 
                                keyboardType="phone-pad" 
                                placeholder="Enter your phone number"
                                placeholderTextColor={theme.colors.disabledText}
                            />
                        </View>
                        <Button 
                            title="Save Changes" 
                            onPress={handleSaveProfileChanges} 
                            disabled={isSavingProfile || isProfileLoading || isUploadingAvatar} 
                            style={styles.primaryButton}
                            textStyle={styles.primaryButtonText}
                            loading={isSavingProfile}
                        />
                    </View>
                </Card>

                <Card style={styles.sectionCard}>
                    <Text style={styles.sectionTitle} fontType="bold">Security</Text>
                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={styles.settingIcon}>
                                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.settingText} fontType="medium">Password</Text>
                        </View>
                        <Button title="Update" style={styles.outlineButtonSmall} textStyle={styles.outlineButtonTextSmall} />
                    </View>
                </Card>
            </View>

            {/* Right Column */}
            <View style={styles.column}>
                <Card style={styles.sectionCard}>
                    <Text style={styles.sectionTitle} fontType="bold">Subscription</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue} fontType="bold">Pro Plan</Text>
                            <Text style={styles.statLabel}>Current Plan</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue} fontType="bold">7 / 10</Text>
                            <Text style={styles.statLabel}>Seats Used</Text>
                        </View>
                    </View>
                    <Button 
                        title="Manage Subscription" 
                        onPress={() => router.push('/(manager)/subscription/manage-subscription')} 
                        style={styles.outlineButton}
                        textStyle={styles.outlineButtonText}
                    />
                </Card>

                <Card style={styles.sectionCard}>
                    <Text style={styles.sectionTitle} fontType="bold">Preferences</Text>
                    <View style={styles.languageSection}>
                        <Text style={styles.label} fontType="bold">Display Language</Text>
                        <LanguageSelector />
                    </View>
                </Card>

                <Button 
                    title="Log Out" 
                    onPress={() => signOut()} 
                    style={styles.logoutButton} 
                    textStyle={styles.logoutButtonText}
                />
            </View>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  scrollContent: {
    padding: theme.spacing(3),
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
  },
  loadingText: {
    marginTop: theme.spacing(2),
    color: theme.colors.bodyText,
  },
  pageHeader: {
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(3),
    backgroundColor: theme.colors.pageBackground,
  },
  pageTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  pageSubtitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  desktopLayout: {
    flexDirection: 'row',
    gap: theme.spacing(2),
  },
  mobileLayout: {
    flexDirection: 'column',
  },
  column: {
    flex: 1,
  },
  sectionCard: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(3),
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  roleBadge: {
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.5),
    borderRadius: theme.radius.pill,
  },
  roleBadgeText: {
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(4),
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: theme.spacing(3),
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.pageBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileMainInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    color: theme.colors.headingText,
  },
  userEmail: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    marginTop: 2,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1),
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
    padding: theme.spacing(2),
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  statValue: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  languageSection: {
    gap: theme.spacing(1),
  },
  primaryButton: {
    height: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing(2),
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
  },
  outlineButton: {
    height: 48,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.lg,
  },
  outlineButtonText: {
    color: theme.colors.bodyText,
    fontSize: 14,
  },
  outlineButtonSmall: {
    height: 36,
    paddingHorizontal: theme.spacing(2),
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.md,
  },
  outlineButtonTextSmall: {
    color: theme.colors.bodyText,
    fontSize: 12,
  },
  logoutButton: {
    height: 56,
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing(2),
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
