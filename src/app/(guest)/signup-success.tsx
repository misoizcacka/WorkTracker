import React from 'react';
import { View, Text, StyleSheet, Platform, Linking } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { theme } from '../../theme';
import { Button } from '../../components/Button';
import AnimatedScreen from '../../components/AnimatedScreen';
import { Ionicons } from '@expo/vector-icons';

const EXPO_GO_APP_STORE_URL = 'https://apps.apple.com/us/app/expo-go/id982107779';
const EXPO_GO_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=host.exp.exponent';

export default function SignupSuccessScreen() {
  const { role } = useLocalSearchParams<{ role?: string }>();

  const renderWorkerContent = () => {
    if (Platform.OS === 'ios') {
      return (
        <>
          <Text style={styles.message}>
            To use the app, please download the Expo Go client from the App Store.
          </Text>
          <Button onPress={() => Linking.openURL(EXPO_GO_APP_STORE_URL)} style={styles.storeButton}>
            <Ionicons name="logo-apple-appstore" size={24} color="white" />
            <Text style={styles.buttonText}>Download from App Store</Text>
          </Button>
        </>
      );
    }
    if (Platform.OS === 'android') {
      return (
        <>
          <Text style={styles.message}>
            To use the app, please download the Expo Go client from the Google Play Store.
          </Text>
          <Button onPress={() => Linking.openURL(EXPO_GO_PLAY_STORE_URL)} style={styles.storeButton}>
            <Ionicons name="logo-google-playstore" size={24} color="white" />
            <Text style={styles.buttonText}>Download from Google Play</Text>
          </Button>
        </>
      );
    }
    // Fallback for web for workers
    return (
      <Link href="/(guest)/login" asChild>
        <Button>
          <Text style={styles.buttonText}>Continue to Login</Text>
        </Button>
      </Link>
    );
  };

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome Aboard!</Text>
        <Text style={styles.message}>
          Your account has been successfully created. Please check your email to verify your account.
        </Text>
        
        {role === 'worker' ? renderWorkerContent() : (
          <Link href="/(guest)/login" asChild>
            <Button>
              <Text style={styles.buttonText}>Go to Login</Text>
            </Button>
          </Link>
        )}
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.pageBackground,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: theme.colors.bodyText,
    marginBottom: 30,
    maxWidth: 300,
  },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF', // A generic blue
    paddingHorizontal: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: 'bold',
  },
});
