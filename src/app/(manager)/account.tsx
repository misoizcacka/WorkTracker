import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Switch, useWindowDimensions, Image, TouchableOpacity, TextInput, ScrollView } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { theme } from "../../theme";
import AnimatedScreen from "../../components/AnimatedScreen";
import { useSession } from "../../context/AuthContext";
import { setStorageItemAsync, useStorageState } from "../../hooks/useStorageState";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LanguageSelector } from "../../components/LanguageSelector";

export default function ManagerAccount() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;
  const { signOut, user } = useSession()!;
  const router = useRouter();

  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [[, isBiometricEnabled], setIsBiometricEnabled] = useStorageState('biometricEnabled');
  
  const [name, setName] = useState("Anna Manager");
  const [phone, setPhone] = useState("+1 234 567 890");

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

  const layoutStyle = isLargeScreen ? styles.desktopLayout : styles.mobileLayout;

  return (
    <AnimatedScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>My Account</Text>
        
        <View style={layoutStyle}>
            <View style={styles.column}>
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>User Profile</Text>
                    <View style={styles.profileHeader}>
                        <Image source={{ uri: 'https://i.pravatar.cc/150?u=manager' }} style={styles.avatar} />
                        <View style={{flex: 1}}>
                            <Text style={styles.name}>{name}</Text>
                            <Text style={styles.email}>{user?.email}</Text>
                            <TouchableOpacity style={styles.uploadButton}>
                                <Ionicons name="camera-outline" size={16} color={theme.colors.primary} />
                                <Text style={styles.uploadButtonText}>Upload Picture</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                    </View>
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
                        <Text style={styles.settingLabel}>Seats Used</Text>
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
});