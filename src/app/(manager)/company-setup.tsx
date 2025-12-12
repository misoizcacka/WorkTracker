import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Button } from '~/components/Button';
import { theme } from '~/theme';
import AnimatedScreen from '~/components/AnimatedScreen';
import { useSession } from '~/context/AuthContext';
import { EmployeesContext } from '~/context/EmployeesContext';
import { supabase } from '~/utils/supabase';
import { Dropdown } from 'react-native-element-dropdown';
import { countries } from '~/utils/countries';

export default function CompanySetup() {
  const router = useRouter();
  const { user, session, refreshUser, isLoading } = useSession();
  const employeesContext = useContext(EmployeesContext);

  const [companyName, setCompanyName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<{ name: string; emoji: string, code: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !session || !employeesContext?.userCompanyId) {
      return;
    }

    const fetchCompanyDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: companyFetchError } = await supabase
                .from('companies')
                .select('name, country')
                .eq('id', employeesContext.userCompanyId)
                .single();

            if (companyFetchError) {
                console.error('Error fetching company details:', companyFetchError);
                setError('Failed to load company details.');
            } else if (data) {
                setCompanyName(data.name || '');
                if (data.country) {
                  const country = countries.find(c => c.name === data.country);
                  setSelectedCountry(country || null);
                }
            }
        } catch (err: any) {
            console.error('Unexpected error fetching company details:', err.message);
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };
    fetchCompanyDetails();
  }, [user, session, employeesContext?.userCompanyId, router, isLoading]);

  const handleSaveCompanyDetails = async () => {
    if (!companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!selectedCountry) {
      setError('Please select a country.');
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
        .update({ name: companyName.trim(), country: selectedCountry.name })
        .eq('id', employeesContext.userCompanyId);

      if (updateError) {
        throw updateError;
      }

      const { data: updatedUser, error: userUpdateError } = await supabase.auth.updateUser({
        data: { company_setup_complete: true }
      });

      if (userUpdateError) {
        throw userUpdateError;
      }

      await refreshUser();
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Company details saved successfully!',
      });

      router.replace('/(manager)/dashboard');

    } catch (err: any) {
      console.error('Unexpected error saving company details:', err.message);
      setError('An unexpected error occurred. Please try again.');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save details. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !error) {
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
          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            iconStyle={styles.iconStyle}
            data={countries}
            search
            maxHeight={300}
            labelField="name"
            valueField="code"
            placeholder="Select Country *"
            searchPlaceholder="Search..."
            value={selectedCountry?.code}
            onChange={item => {
              setSelectedCountry(item);
            }}
            renderLeftIcon={() => (
              <Text style={{ marginRight: 10, fontSize: 18 }}>{selectedCountry?.emoji}</Text>
            )}
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
  dropdown: {
    height: 50,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: 'white',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#999',
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
});