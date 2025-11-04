import React, { useState, useContext } from "react";
import { View, Text, TextInput, StyleSheet, Alert, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../../components/Button";
import { LanguageSelector } from "../../components/LanguageSelector";
import { theme } from "../../theme";
import { I18nContext } from "../../I18nContext";

export default function SignUp() {
  const i18n = useContext(I18nContext);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleSignUp = () => {
    if (password !== confirmPassword) {
      Alert.alert("Sign Up Failed", "Passwords do not match.");
      return;
    }
    // TODO: Implement actual sign-up logic for managers
    console.log("Signing up with", { email, password });
    // For now, just navigate to login after sign up
    router.replace("/(guest)/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <LanguageSelector />
      <Text style={styles.appName}>⏰ {i18n.t('login.appName')}</Text>
      <View style={styles.content}>
        <Text style={styles.loginHeading}>{i18n.t('signup.title')}</Text>
        <Text style={styles.loginDescription}>{i18n.t('signup.description')}</Text>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('signup.companyName')}
          value={companyName}
          onChangeText={setCompanyName}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('signup.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('signup.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('signup.confirmPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <Button
          title={i18n.t('signup.signupButton')}
          onPress={handleSignUp}
          style={styles.loginButton}
          textStyle={styles.loginButtonText}
        />
        <View style={styles.separatorContainer}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>{i18n.t('login.or')}</Text>
          <View style={styles.separatorLine} />
        </View>
        <Button
          title={i18n.t('signup.loginButton')}
          onPress={() => router.push("/(guest)/login")}
          type="secondary"
          textStyle={styles.managerButtonText}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing(4),
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing(1),
    paddingTop: theme.spacing(2),
  },
  loginHeading: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing(2),
  },
  loginDescription: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing(4),
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
  managerButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "normal",
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: theme.spacing(2),
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.lightBorder,
  },
  separatorText: {
    marginHorizontal: theme.spacing(2),
    color: theme.colors.textLight,
  },
});
