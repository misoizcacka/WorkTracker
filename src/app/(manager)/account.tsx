import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, Switch } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { theme } from "../../theme";
import { useSession } from "../AuthContext";
import { setStorageItemAsync, useStorageState } from "../../hooks/useStorageState";

export default function ManagerAccount() {
  const { signOut, user } = useSession()!;
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [[isLoading, isBiometricEnabled], setIsBiometricEnabled] = useStorageState('biometricEnabled');

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
    })();
  });

  const handleBiometricSwitch = async (value: boolean) => {
    if (value) {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (enrolled) {
        const result = await LocalAuthentication.authenticateAsync();
        if (result.success) {
          await setStorageItemAsync('biometricUser', JSON.stringify({ email: user.email }));
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
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Account</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>Anna Manager</Text>

        <Text style={styles.label}>Role:</Text>
        <Text style={styles.value}>Project Manager</Text>

        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </Card>

      {isBiometricSupported && (
        <Card style={styles.card}>
          <View style={styles.biometricRow}>
            <Text style={styles.biometricText}>Enable Biometric Login</Text>
            <Switch value={isBiometricEnabled === 'true'} onValueChange={handleBiometricSwitch} />
          </View>
        </Card>
      )}

      <Button
        title="Log Out"
        onPress={() => signOut()}
        type="danger"
        style={{ marginTop: theme.spacing(3), width: "100%" }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing(3) },
  title: { fontSize: 24, fontWeight: "bold", color: theme.colors.text, marginBottom: theme.spacing(3), textAlign: "center", paddingTop: theme.spacing(2) },
  card: { width: "100%", marginBottom: theme.spacing(3) },
  label: { fontSize: 16, color: theme.colors.textLight, marginTop: theme.spacing(1) },
  value: { fontSize: 18, fontWeight: "600", color: theme.colors.text },
  biometricRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  biometricText: { fontSize: 16, color: theme.colors.text },
});
