import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Platform, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function CompanyDetails() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleFinishSetup = () => {
    const newErrors: { [key: string]: string } = {};
    if (!companyName) newErrors.companyName = 'Company Name is required.';
    if (!companyCountry) newErrors.companyCountry = 'Company Country is required.';
    if (!companyAddress) newErrors.companyAddress = 'Company Address is required.';
    if (!businessType) newErrors.businessType = 'Business Type is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    localStorage.setItem('companyDetails', JSON.stringify({
      companyName,
      companyCountry,
      companyAddress,
      businessType,
    }));
    // Redirect to dashboard
    router.push('/(manager)/dashboard'); // Assuming /app redirects to /(manager)/dashboard for logged-in users
  };

  return (
    <AnimatedScreen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Company Information</Text>
          <Text style={styles.description}>Tell us a bit about your company to tailor your experience.</Text>

          <TextInput
            style={styles.input}
            placeholder="Company Name *"
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="words"
            placeholderTextColor="#999"
          />
          {errors.companyName && <Text style={styles.errorText}>{errors.companyName}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Company Country *"
            value={companyCountry}
            onChangeText={setCompanyCountry}
            autoCapitalize="words"
            placeholderTextColor="#999"
          />
          {errors.companyCountry && <Text style={styles.errorText}>{errors.companyCountry}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Company Address *"
            value={companyAddress}
            onChangeText={setCompanyAddress}
            autoCapitalize="words"
            placeholderTextColor="#999"
          />
          {errors.companyAddress && <Text style={styles.errorText}>{errors.companyAddress}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Business Type (e.g., Construction) *"
            value={businessType}
            onChangeText={setBusinessType}
            autoCapitalize="words"
            placeholderTextColor="#999"
          />
          {errors.businessType && <Text style={styles.errorText}>{errors.businessType}</Text>}

          <Button
            onPress={handleFinishSetup}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          >
            <Text style={styles.primaryButtonText}>Finish Setup</Text>
          </Button>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing(4),
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
  errorText: {
    color: theme.colors.error,
    marginBottom: theme.spacing(2),
    fontSize: 14,
    textAlign: 'left',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(3),
    height: 50,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
