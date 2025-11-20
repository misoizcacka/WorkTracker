import React, { useState, useEffect } from "react";
import { Text, StyleSheet, Switch, View, ScrollView } from "react-native";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as LocalAuthentication from "expo-local-authentication";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { theme } from "../../../theme";
import AnimatedScreen from "../../../components/AnimatedScreen";
import { useSession } from "../../../context/AuthContext";
import { setStorageItemAsync, useStorageState } from "../../../hooks/useStorageState";
import { Ionicons } from "@expo/vector-icons";

export default function WorkerAccountScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { signOut, user } = useSession()!;
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [[isLoading, isBiometricEnabled], setIsBiometricEnabled] = useStorageState('biometricEnabled');

  // Mock user data
  const mockUser = {
    firstName: "John",
    lastName: "Worker",
    email: user?.email || "worker@example.com",
    role: "Construction Worker",
  };

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
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to enable biometric login',
        });
        if (result.success) {
          await setStorageItemAsync('biometricUser', JSON.stringify({ email: mockUser.email }));
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

  return (
    <AnimatedScreen>
      <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
        <View style={styles.header}>
          <Text style={styles.title}>My Account</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.infoCard}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={50} color={theme.colors.primary} />
            </View>
            <Text style={styles.name}>{`${mockUser.firstName} ${mockUser.lastName}`}</Text>
            <Text style={styles.role}>{mockUser.role}</Text>
          </Card>

          <Card style={styles.detailsCard}>
            <View style={styles.detailItem}>
              <Ionicons name="mail-outline" size={24} color={theme.colors.bodyText} />
              <Text style={styles.detailText}>{mockUser.email}</Text>
            </View>
          </Card>

          {isBiometricSupported && (
            <Card style={styles.settingsCard}>
              <View style={styles.settingItem}>
                <Ionicons name="finger-print-outline" size={24} color={theme.colors.headingText} />
                <Text style={styles.settingText}>Enable Biometric Login</Text>
                <Switch
                  value={isBiometricEnabled === 'true'}
                  onValueChange={handleBiometricSwitch}
                  trackColor={{ false: theme.colors.accent, true: theme.colors.primary }}
                  thumbColor={theme.colors.cardBackground}
                />
              </View>
            </Card>
          )}

          <Button
            title="Log Out"
            onPress={() => signOut()}
            style={styles.logoutButton}
            textStyle={styles.logoutButtonText}
          />
        </ScrollView>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  header: {
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(1),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  content: {
    padding: theme.spacing(2),
  },
  infoCard: {
    alignItems: 'center',
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.headingText,
  },
  role: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginTop: 4,
  },
  detailsCard: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 16,
    marginLeft: theme.spacing(2),
    color: theme.colors.headingText,
  },
  settingsCard: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingText: {
    fontSize: 16,
    marginLeft: theme.spacing(2),
    flex: 1,
    color: theme.colors.headingText,
  },
  logoutButton: {
    backgroundColor: theme.colors.danger,
    marginTop: theme.spacing(2),
  },
  logoutButtonText: {
    color: theme.colors.cardBackground,
    fontWeight: 'bold',
  },
});
