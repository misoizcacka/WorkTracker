import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../../components/Button";
import { theme } from "../../theme";

import { WorkersContext } from "./WorkersContext";

export default function CreateWorker() {
  const router = useRouter();
  const { addWorker } = React.useContext(WorkersContext)!;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleCreateWorker = () => {
    addWorker({ name, email, password, status: "notCheckedIn", hours: 0, project: "" });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Worker</Text>
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
      <Button title="Create Worker" onPress={handleCreateWorker} style={styles.loginButton} textStyle={styles.loginButtonText} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing(4),
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing(2),
    paddingTop: theme.spacing(2),
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
  loginButton: {
    backgroundColor: "black",
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(2),
  },
  loginButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "normal",
  },
});
