import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, SafeAreaView, Image } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { LanguageSelector } from "../../components/LanguageSelector";
import { theme } from "../../theme";
import { PixelatedBackground } from '../../components/PixelatedBackground';

export default function SignUp() {
  const { t } = useTranslation();
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
      <PixelatedBackground />
      <LanguageSelector />
      <Image
        source={require('../../../assets/logowhitetransparent.png')}
        style={styles.logo}
      />
      <View style={styles.centeredContentWrapper}>
        <View style={styles.content}>
          <Text style={styles.loginHeading}>{t('signup.title')}</Text>
          <Text style={styles.loginDescription}>{t('signup.description')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('signup.companyName')}
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={t('signup.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={t('signup.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder={t('signup.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <Button
            title={t('signup.signupButton')}
            onPress={handleSignUp}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          />
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>{t('login.or')}</Text>
            <View style={styles.separatorLine} />
          </View>
          <Button
            title={t('signup.loginButton')}
            onPress={() => router.push("/(guest)/login")}
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
  logo: {
    width: 200, // Adjust as needed
    height: 60, // Adjust as needed
    resizeMode: 'contain',
    alignSelf: 'center',
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
