import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '~/components/Button';
import { theme } from '~/theme';
import AnimatedScreen from '~/components/AnimatedScreen';
import { useSession } from '~/context/AuthContext';
import { EmployeesContext } from '~/context/EmployeesContext';
import { supabase } from '~/utils/supabase';

export default function CompanySetup() {
  const router = useRouter();
  const { user, session } = useSession();
  const employeesContext = useContext(EmployeesContext);

  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState(''); // Example additional field
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !session || !employeesContext?.userCompanyId) {
      // User should be logged in and have a company_id
      // If not, redirect to dashboard or login
      router.replace('/(manager)/dashboard'); // Or another appropriate redirect
      return;
    }

    // Try to pre-fill company name if already available (from signup)
    const fetchCompanyDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: companyFetchError } = await supabase
                .from('companies')
                .select('name, country') // Assuming 'country' column exists or will be added
                .eq('id', employeesContext.userCompanyId)
                .single();

            if (companyFetchError) {
                console.error('Error fetching company details:', companyFetchError);
                setError('Failed to load company details.');
            } else if (data) {
                setCompanyName(data.name || '');
                setCountry(data.country || ''); // Pre-fill if exists
            }
        } catch (err: any) {
            console.error('Unexpected error fetching company details:', err.message);
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };
    fetchCompanyDetails();
  }, [user, session, employeesContext?.userCompanyId, router]);


  const handleSaveCompanyDetails = async () => {
    if (!companyName) {
      setError('Company name is required.');
      return;
    }
    if (!employeesContext?.userCompanyId) {
        setError('Company ID not found. Please log in again.');
        return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('companies')
        .update({ name: companyName, country: country }) // Assuming 'country' column can be updated
        .eq('id', employeesContext.userCompanyId);

      if (updateError) {
        console.error('Error updating company details:', updateError);
        setError('Failed to save company details. Please try again.');
      } else {
        Alert.alert('Success', 'Company details saved!');
        router.replace('/(manager)/dashboard'); // Redirect to dashboard after saving
      }
    } catch (err: any) {
      console.error('Unexpected error saving company details:', err.message);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
    );
  }

  return (
    <AnimatedScreen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Company Setup</Text>
          <Text style={styles.description}>
            Finalize your company details to get started with your account.
          </Text>

          {error && <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View>}

          <TextInput
            style={styles.input}
            placeholder="Company Name *"
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="words"
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            placeholder="Country"
            value={country}
            onChangeText={setCountry}
            autoCapitalize="words"
            placeholderTextColor="#999"
          />
          
          <Button
            onPress={handleSaveCompanyDetails}
            disabled={loading}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save Details</Text>}
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
  errorContainer: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  errorText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
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
