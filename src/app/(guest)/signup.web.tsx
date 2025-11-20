import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, SafeAreaView, Platform, ScrollView } from 'react-native';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';
import { PixelatedBackground } from '../../components/PixelatedBackground';
import { useRouter } from 'expo-router';

export default function WebSignup() {
  const { t } = useTranslation();
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignup = () => {
    if (!companyName || !email || !password || !confirmPassword) {
      Alert.alert(t('signup.error'), t('signup.allFieldsRequired'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('signup.error'), t('signup.passwordsMismatch'));
      return;
    }

    // Basic email validation
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Alert.alert(t('signup.error'), t('signup.invalidEmail'));
      return;
    }

    // Password strength (example: at least 6 characters)
    if (password.length < 6) {
      Alert.alert(t('signup.error'), t('signup.passwordTooShort'));
      return;
    }

    // For now, just navigate to the pricing page
    router.push('/(guest)/pricing');
  };

  return (
    <SafeAreaView style={styles.container}>
      <PixelatedBackground />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('signup.title')}</Text>
          <Text style={styles.description}>{t('signup.description')}</Text>

          <TextInput
            style={styles.input}
            placeholder={t('signup.companyName')}
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="words"
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
            title={t('signup.continueButton')} // New translation key for continue
            onPress={handleSignup}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
    padding: theme.spacing(4),
    backgroundColor: 'white',
    marginHorizontal: 'auto', // Center content on web
    maxWidth: 500, // Limit width on web
    width: '100%',
    borderRadius: theme.radius.md,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  description: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
  },
  input: {
    height: 50,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.headingText,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
