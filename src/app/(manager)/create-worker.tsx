import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, useWindowDimensions } from "react-native";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from "expo-router";
import { Button } from "../../components/Button";
import AnimatedScreen from "../../components/AnimatedScreen";
import { theme } from "../../theme";

import { WorkersContext } from "./WorkersContext";

export default function CreateWorker() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;
  const tabBarHeight = isLargeScreen ? 0 : useBottomTabBarHeight();
  const router = useRouter();
  const { addWorker } = React.useContext(WorkersContext)!;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleCreateWorker = () => {
    const newId = Math.random().toString(36).substring(2, 15); // Generate a simple unique ID
    addWorker({ id: newId, name, email, password, status: "notCheckedIn", hours: 0, project: "" });
    router.back();
  };

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <View style={{ flex: 1, backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, justifyContent: "center", padding: theme.spacing(4), paddingBottom: tabBarHeight }}>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button title="Create Worker" onPress={handleCreateWorker} style={styles.primaryButton} textStyle={styles.primaryButtonText} />
        </View>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  input: {
    height: 50,
    borderColor: theme.colors.lightBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.text,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(2),
  },
  primaryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "normal",
  },
});
