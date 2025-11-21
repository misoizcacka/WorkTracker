import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';


export default function PaymentPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { managerEmail, companyName, managerName, planId, planName, planPrice } = params;

  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = () => {
    if (!cardNumber || !expiryDate || !cvv || !cardHolderName) {
      Alert.alert('Error', 'Please fill in all payment details.');
      return;
    }

    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      Alert.alert(
        'Payment Successful!',
        `Thank you ${managerName} from ${companyName} for purchasing the ${planName} for ${planPrice}. You can now log in.`,
        [{ text: 'OK', onPress: () => router.replace('/(guest)/login') }]
      );
    }, 2000);
  };

  if (!managerEmail || !companyName || !planName || !planPrice) {
    // Redirect if essential parameters are missing
    return (
        <AnimatedScreen>

            <View style={styles.centered}>
                <Text style={styles.errorText}>Missing payment information. Please restart registration.</Text>
                <Button title="Go to Home" onPress={() => router.replace('/')} />
            </View>
        </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Complete Your Payment</Text>
          <Text style={styles.description}>
            You are purchasing the <Text style={{ fontWeight: 'bold' }}>{planName}</Text> for <Text style={{ fontWeight: 'bold' }}>{planPrice}</Text>.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Card Number *"
            value={cardNumber}
            onChangeText={setCardNumber}
            keyboardType="numeric"
            maxLength={16}
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            placeholder="Card Holder Name *"
            value={cardHolderName}
            onChangeText={setCardHolderName}
            autoCapitalize="words"
            placeholderTextColor="#999"
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="Expiry Date (MM/YY) *"
              value={expiryDate}
              onChangeText={setExpiryDate}
              keyboardType="numeric"
              maxLength={5}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="CVV *"
              value={cvv}
              onChangeText={setCvv}
              keyboardType="numeric"
              maxLength={3}
              secureTextEntry
              placeholderTextColor="#999"
            />
          </View>
          
          <Button
            onPress={handlePayment}
            disabled={isProcessing}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          >
            {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Complete Payment</Text>}
          </Button>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    padding: theme.spacing(2),
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing(2),
  },
  content: {
    justifyContent: 'center',
    padding: theme.spacing(4),
    backgroundColor: 'white',
    marginHorizontal: 'auto',
    maxWidth: 500,
    width: '100%',
    borderRadius: theme.radius.lg,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      native: {
        elevation: 8,
      }
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
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
  },
  halfWidth: {
    width: '48%', // Adjust for spacing
    marginBottom: 0, // Remove bottom margin if part of a row
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
    height: 50,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});