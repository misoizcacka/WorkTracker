import React, { useState, useEffect, useReducer, useContext } from "react";
import { View, Text, TextInput, StyleSheet, Alert, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../../components/Button";
import { LanguageSelector } from "../../components/LanguageSelector";
import { theme } from "../../theme";
import { languageStore } from "../../languageStore";
import { useSession } from "../AuthContext";
import { I18nContext } from "../../I18nContext";

export default function Login() {
  const { signIn } = useSession()!;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const i18n = useContext(I18nContext);



  const handleLogin = () => {
    // TODO: Implement actual login logic
    if (email === "manager@test.com" && password === "password") {
      signIn({ role: "manager", email });
    } else if (email === "worker@test.com" && password === "password") {
      signIn({ role: "worker", email });
    } else {
      Alert.alert("Login Failed", "Invalid email or password.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LanguageSelector />
      <Text style={styles.appName}>⏰ {i18n.t('login.appName')}</Text>
      <View style={styles.content}>
        <Text style={styles.loginHeading}>{i18n.t('login.loginHeading')}</Text>
        <Text style={styles.loginDescription}>{i18n.t('login.loginDescription')}</Text>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('login.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('login.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button
          title={i18n.t('login.continueButton')}
          onPress={handleLogin}
          style={styles.loginButton}
          textStyle={styles.loginButtonText}
        />
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            {i18n.t('login.termsText')} <Text style={styles.termsLink}>{i18n.t('login.termsLink')}</Text> {i18n.t('login.and')} <Text style={styles.termsLink}>{i18n.t('login.privacyLink')}</Text>
          </Text>
        </View>
        <View style={styles.separatorContainer}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>{i18n.t('login.or')}</Text>
          <View style={styles.separatorLine} />
        </View>
        <Button
          title={i18n.t('login.registerManagerButton')}
          onPress={() => router.push("/(guest)/signup")}
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
  termsContainer: {
    marginTop: theme.spacing(2),
    alignItems: "center",
  },
  termsText: {
    color: "#828282",
    fontSize: 12,
    textAlign: "center",
  },
  termsLink: {
    color: theme.colors.text,
    fontWeight: "bold",
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
