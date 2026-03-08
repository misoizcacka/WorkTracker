import React, { useState, useEffect, useContext } from "react";
import { View, StyleSheet, useWindowDimensions, Image, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { Text } from "../../components/Themed";
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import moment from 'moment';

import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { theme } from "../../theme";
import AnimatedScreen from "../../components/AnimatedScreen";
import { useSession } from "../../context/AuthContext";
import { useProfile } from "../../context/ProfileContext";
import { EmployeesContext, EmployeesContextType } from "../../context/EmployeesContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { uploadAvatar, updateEmployeeProfile } from "../../services/profile";
import { supabase } from "../../utils/supabase";

export default function ManagerAccount() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;
  const { signOut, user, userCompanyName, userCompanyId, userSubscriptionPeriodEnd, refreshUser } = useSession()!;
  const { profile, isLoading: isProfileLoading, refetchProfile } = useProfile();
  const employeesContext = useContext(EmployeesContext) as EmployeesContextType;
  const router = useRouter();

  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [companyName, setCompanyName] = useState(userCompanyName || '');
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
      setPhone(profile.phone_number || '');
    }
  }, [profile]);

  useEffect(() => {
    if (userCompanyName) {
      setCompanyName(userCompanyName);
    }
  }, [userCompanyName]);

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
    if (name === profile.full_name && phone === profile.phone_number) {
        Toast.show({ type: 'info', text1: 'No Changes', text2: 'No profile changes to save.' });
        return;
    }

    setIsSavingProfile(true);
    try {
        await updateEmployeeProfile(user.id, { full_name: name, phone_number: phone });
        await refetchProfile();
        Toast.show({ type: 'success', text1: 'Profile Saved', text2: 'Your profile details have been updated.' });
    } catch (error: any) {
        console.error("Error saving profile changes:", error);
        Alert.alert("Save Failed", error.message || "Failed to save profile changes.");
    } finally {
        setIsSavingProfile(false);
    }
  };

  const handleSaveCompanyChanges = async () => {
    if (!userCompanyId) return;
    if (companyName === userCompanyName) {
        Toast.show({ type: 'info', text1: 'No Changes', text2: 'Company name is the same.' });
        return;
    }

    setIsSavingCompany(true);
    try {
        const { error } = await supabase
            .from('companies')
            .update({ name: companyName })
            .eq('id', userCompanyId);

        if (error) throw error;
        
        await refreshUser();
        Toast.show({ type: 'success', text1: 'Company Updated', text2: 'Your company name has been updated.' });
    } catch (error: any) {
        console.error("Error saving company changes:", error);
        Alert.alert("Save Failed", error.message || "Failed to update company name.");
    } finally {
        setIsSavingCompany(false);
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
  const seatsUsed = employeesContext?.seatsUsed || 0;
  const seatLimit = employeesContext?.seatLimit || 0;

  return (
    <AnimatedScreen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle} fontType="bold">My Account</Text>
          <Text style={styles.pageSubtitle}>Manage your personal profile and company settings.</Text>
        </View>

        <View style={styles.accountContent}>
          <View style={styles.column}>
            {/* 1. Profile Section */}
            <Card style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle} fontType="bold">Profile Details</Text>
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
                  <TouchableOpacity 
                    style={styles.editAvatarButton} 
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
                <View style={styles.profileMainInfo}>
                  <Text style={styles.userName} fontType="bold">{profile?.full_name}</Text>
                  <Text style={styles.userEmail}>{user?.email}</Text>
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
                <View style={styles.inputGroup}>
                  <Text style={styles.label} fontType="bold">Email Address</Text>
                  <TextInput 
                    style={[styles.input, styles.disabledInput]} 
                    value={user?.email} 
                    editable={false}
                  />
                  <Text style={styles.inputHint}>Email cannot be changed from the app.</Text>
                </View>
                
                <Button 
                  title="Save Changes" 
                  onPress={handleSaveProfileChanges} 
                  disabled={isSavingProfile || isProfileLoading || isUploadingAvatar} 
                  style={styles.primaryButton}
                  loading={isSavingProfile}
                />
              </View>
            </Card>

            {/* 2. Company Profile Section */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle} fontType="bold">Company Profile</Text>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label} fontType="bold">Company Name</Text>
                  <TextInput 
                    style={styles.input} 
                    value={companyName} 
                    onChangeText={setCompanyName} 
                    placeholder="Enter company name"
                    placeholderTextColor={theme.colors.disabledText}
                  />
                </View>
                <Button 
                  title="Update" 
                  onPress={handleSaveCompanyChanges} 
                  disabled={isSavingCompany || companyName === userCompanyName} 
                  style={styles.primaryButton}
                  loading={isSavingCompany}
                />
              </View>
            </Card>
          </View>

          <View style={styles.column}>
            {/* 3. Subscription Card */}
            <Card style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle} fontType="bold">Subscription & Billing</Text>
                <Ionicons name="card-outline" size={20} color={theme.colors.primary} />
              </View>
              
              <View style={styles.subscriptionStats}>
                <View style={styles.subStatBox}>
                  <Text style={styles.subStatValue} fontType="bold">{seatsUsed}</Text>
                  <Text style={styles.subStatLabel}>Active Workers</Text>
                </View>
                <View style={[styles.subStatBox, styles.subStatDivider]}>
                  <Text style={styles.subStatValue} fontType="bold">{seatLimit}</Text>
                  <Text style={styles.subStatLabel}>Worker Seats</Text>
                </View>
              </View>

              <View style={styles.usageContainer}>
                <View style={styles.usageHeader}>
                  <Text style={styles.usageLabel}>Seat Utilization</Text>
                  <Text style={styles.usageValue}>{Math.round((seatsUsed / (seatLimit || 1)) * 100)}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${Math.min((seatsUsed / (seatLimit || 1)) * 100, 100)}%` }
                    ]} 
                  />
                </View>
              </View>

              {userSubscriptionPeriodEnd && (
                <View style={styles.periodContainer}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.bodyText} />
                  <Text style={styles.periodEndText}>
                    Next renewal: <Text fontType="bold" style={{ color: theme.colors.headingText }}>{moment(userSubscriptionPeriodEnd).format('MMMM D, YYYY')}</Text>
                  </Text>
                </View>
              )}

              <Button 
                title="Manage Subscription" 
                onPress={() => router.push('/(manager)/subscription/manage-subscription')} 
                style={styles.manageSubButton}
              />
            </Card>

            {/* 4. Security */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle} fontType="bold">Security</Text>
              <View style={styles.securityItem}>
                <View style={styles.securityInfo}>
                  <View style={styles.securityIcon}>
                    <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.securityTitle} fontType="medium">Password</Text>
                    <Text style={styles.securitySubtitle}>Last changed long ago</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.securityAction}>
                  <Text style={styles.securityActionText} fontType="bold">UPDATE</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* 5. Logout */}
            <Button 
              title="Sign Out" 
              onPress={() => signOut()} 
              style={styles.logoutButton}
            />
          </View>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: theme.spacing(4),
    ...Platform.select({
      web: {
        maxWidth: 1200,
        alignSelf: 'center',
        paddingHorizontal: theme.spacing(4),
      },
    }),
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing(2),
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  pageHeader: {
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  pageSubtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.bodyText,
  },
  accountContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -theme.spacing(2),
  },
  column: {
    width: '100%',
    paddingHorizontal: theme.spacing(2),
    ...Platform.select({
      web: {
        width: '50%',
      },
    }),
  },
  sectionCard: {
    marginBottom: theme.spacing(2),
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(3),
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
  editAvatarButton: {
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
  disabledInput: {
    backgroundColor: theme.colors.borderColor + '30',
    color: theme.colors.disabledText,
  },
  inputHint: {
    fontSize: 11,
    color: theme.colors.disabledText,
    marginTop: 4,
    marginLeft: 4,
  },
  primaryButton: {
    height: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing(2),
  },
  manageSubButton: {
    height: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
  },
  logoutButton: {
    height: 52,
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing(1),
  },
  subscriptionStats: {
    flexDirection: 'row',
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  subStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  subStatDivider: {
    borderLeftWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  subStatValue: {
    fontSize: 24,
    color: theme.colors.primary,
  },
  subStatLabel: {
    fontSize: 11,
    color: theme.colors.bodyText,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  usageContainer: {
    marginBottom: theme.spacing(2),
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  usageLabel: {
    fontSize: 13,
    color: theme.colors.bodyText,
  },
  usageValue: {
    fontSize: 13,
    color: theme.colors.headingText,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.borderColor,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  periodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing(3),
    paddingHorizontal: 4,
  },
  periodEndText: {
    fontSize: 13,
    color: theme.colors.bodyText,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1),
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityTitle: {
    fontSize: 16,
    color: theme.colors.headingText,
  },
  securitySubtitle: {
    fontSize: 12,
    color: theme.colors.disabledText,
  },
  securityAction: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
  },
  securityActionText: {
    fontSize: 12,
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
});
