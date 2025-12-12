import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { StoreButtons } from '../../components/StoreButtons';
import { View as ThemedView } from '../../components/Themed';
import { Button } from '../../components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

// TODO: Replace with your actual app's deep link scheme. For Expo Go testing, use your local Expo Go URL (e.g., 'exp://192.168.1.XXX:19000').
const DEEP_LINK_URL = 'exp://YOUR_LOCAL_IP:PORT';

export default function SignupSuccessScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Text style={styles.icon}>🎉</Text>
        <Text style={styles.title}>Your account has been created!</Text>
        <Text style={styles.subtitle}>
          To continue, please download the mobile app and log in there.
        </Text>
        
        <StoreButtons />

        <View style={styles.buttonContainer}>
          <Link href={DEEP_LINK_URL} asChild>
            <Button>
                <Text>Open the App</Text>
            </Button>
          </Link>
          <View style={{ height: 10 }} />
          <Link href="/(guest)/login" asChild>
            <Button type="secondary">
                <Text>I'll open the app later</Text>
            </Button>
          </Link>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 320,
  },
  buttonContainer: {
    marginTop: 20,
    width: '80%',
    maxWidth: 300,
  },
});