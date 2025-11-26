import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Platform, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { supabase } from '../../utils/supabase';
import { useSession } from '../../context/AuthContext';
import CrossPlatformPicker from '../../components/CrossPlatformPicker';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

// Simplified list of countries for the picker
const COUNTRIES = [
  { label: 'Select Country', value: '' },
  { label: 'United States', value: 'US' },
  { label: 'Canada', value: 'CA' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Germany', value: 'DE' },
  { label: 'France', value: 'FR' },
  { label: 'Spain', value: 'ES' },
  { label: 'Australia', value: 'AU' },
  { label: 'New Zealand', value: 'NZ' },
  { label: 'Serbia', value: 'RS' },
  { label: 'Sweden', value: 'SE' },
  // Add more countries as needed
];

export default function CompanyDetails() {
  const router = useRouter();
  const { refreshUser } = useSession();
  const { organizationId } = useLocalSearchParams();

  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      Alert.alert('Error', 'Organization ID missing. Please contact support.');
      router.replace('/(guest)/login'); // Redirect to login or an error page
      return;
    }

    const fetchOrganizationDetails = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('name, country, address, phone_number')
        .eq('id', organizationId)
        .single();

      if (error) {
        Alert.alert('Error', `Failed to load organization details: ${error.message}`);
        router.replace('/(manager)/dashboard'); // Redirect if details can't be loaded
        return;
      }

      if (data) {
        setCompanyName(data.name || '');
        setCountry(data.country || '');
        setAddress(data.address || '');
        setPhone(data.phone_number || '');
      }
      setIsLoading(false);
    };

    fetchOrganizationDetails();
  }, [organizationId]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!companyName.trim()) newErrors.companyName = 'Company Name is required.';
    if (!country) newErrors.country = 'Country is required.';
    // Address, Phone are optional, no validation for them here
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!organizationId) {
      Alert.alert('Error', 'Organization ID missing for update.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        name: companyName,
        country: country,
        address: address || null,
        phone_number: phone || null,
      })
      .eq('id', organizationId);

    if (error) {
      Alert.alert('Error', `Failed to update company details: ${error.message}`);
    } else {
      await refreshUser(); // Refresh user session to ensure app_metadata is current
      router.replace('/(manager)/dashboard'); // Route to dashboard after successful update
    }
    setIsSubmitting(false);
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Company Info?',
      'Warning: Company information is necessary for official invoices and financial reporting. Are you sure you want to skip?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip Anyway',
          onPress: () => router.replace('/(manager)/dashboard'),
        },
      ],
      { cancelable: false }
    );
  };

  if (isLoading) {
    return (
      <AnimatedScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading company details...</Text>
        </View>
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Company Information</Text>
          <Text style={styles.description}>Please provide your company details. This information is required for invoicing.</Text>

          {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Company Name *"
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="words"
            placeholderTextColor="#999"
          />
          {errors.companyName && <Text style={styles.errorText}>{errors.companyName}</Text>}

          <CrossPlatformPicker
            selectedValue={country}
            onValueChange={(value) => setCountry(value || '')}
            options={COUNTRIES}
            placeholder="Select Country *"
          />
          {errors.country && <Text style={styles.errorText}>{errors.country}</Text>}
          
          <TextInput
            style={styles.input}
            placeholder="Address (Optional)"
            value={address}
            onChangeText={setAddress}
            autoCapitalize="words"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Phone (Optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />

          <Button
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          >
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save Details</Text>}
          </Button>

          <Button
            onPress={handleSkip}
            style={styles.secondaryButton}
            textStyle={styles.secondaryButtonText}
          >
            <Text style={styles.secondaryButtonText}>Skip for now</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.bodyText,
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
    color: theme.colors.danger,
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
  secondaryButton: {
    backgroundColor: theme.colors.secondary, // Assuming a secondary color
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(1),
    height: 50,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
