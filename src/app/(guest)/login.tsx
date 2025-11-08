import * as React from "react";
import { useState, useEffect, useReducer, useContext } from "react";
import { View, Text, TextInput, StyleSheet, Alert, SafeAreaView, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../../components/Button";
import { LanguageSelector } from "../../components/LanguageSelector";
import { theme } from "../../theme";
import { languageStore } from "../../languageStore";
import { useSession } from "../AuthContext";
import { useTranslation } from 'react-i18next';

import { LinearGradient } from 'expo-linear-gradient';
import { PixelatedBackground } from '../../components/PixelatedBackground';

export default function Login() {
  const { signIn } = useSession()!;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { t } = useTranslation();

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
      <PixelatedBackground />
      <LanguageSelector />
      <Text style={styles.appName}>{t('login.appName')}</Text>
      <View style={styles.centeredContentWrapper}>
        <View style={styles.content}>
          <Text style={styles.loginHeading}>{t('login.loginHeading')}</Text>
          <Text style={styles.loginDescription}>{t('login.loginDescription')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('login.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={t('login.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button
            title={t('login.continueButton')}
            onPress={handleLogin}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          />
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              {t('login.termsText')} <Text style={styles.termsLink}>{t('login.termsLink')}</Text> {t('login.and')} <Text style={styles.termsLink}>{t('login.privacyLink')}</Text>
            </Text>
          </View>
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>{t('login.or')}</Text>
            <View style={styles.separatorLine} />
          </View>
          <Button
            title={t('login.registerManagerButton')}
            onPress={() => router.push("/(guest)/signup")}
            type="secondary"
            textStyle={styles.managerButtonText}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContentWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    justifyContent: "center",
    padding: theme.spacing(4),
    backgroundColor: 'white',
  },
  appName: {
    fontSize: 32,
    color: "white",
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
  gradientContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
});
