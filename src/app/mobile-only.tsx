import { View, Text, StyleSheet } from 'react-native';
import { StoreButtons } from '../components/StoreButtons';
import { View as ThemedView } from '../components/Themed';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MobileOnlyScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView>
        <Text style={styles.icon}>🚫</Text>
        <Text style={styles.title}>Web access not available</Text>
        <Text style={styles.subtitle}>
          Your account is restricted to the mobile app.
        </Text>
        <Text style={styles.subtitle}>
          📱 Please continue inside the mobile app.
        </Text>
        <StoreButtons />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
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
    marginBottom: 5,
  },
});
