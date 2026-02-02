import React, { useState, useContext, useEffect } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, ScrollView, Platform, Image, Dimensions } from 'react-native';
import { useRouter, Link } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { useSession } from '../../context/AuthContext';
import { EmployeesContext } from '../../context/EmployeesContext';
import { supabase } from '../../utils/supabase';
import { Dropdown } from 'react-native-element-dropdown';
import { countries } from '../../utils/countries';
import { Text } from '../../components/Themed'; // Import Themed Text

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function CompanySetup() {
  const router = useRouter();
  const { user, session, refreshUser, isLoading, userCompanyId } = useSession();

  const [companyName, setCompanyName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<{ name: string; emoji: string, code: string } | null>(null);
  const [loading, setLoading] = useState(true); // Changed to true initially to show loading state
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return; // Wait for session loading
    if (!user || !session) {
      router.replace('/(guest)/login'); // Redirect if no user session
      return;
    }

    if (!userCompanyId) {
        setError('Company ID not found. Please log in again.');
        setLoading(false);
        return;
    }

    const fetchCompanyDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: companyFetchError } = await supabase
                .from('companies')
                .select('name, country')
                .eq('id', userCompanyId)
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
  }, [user, session, userCompanyId, router, isLoading]);

  const handleSaveCompanyDetails = async () => {
    if (!companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!selectedCountry) {
      setError('Please select a country.');
      return;
    }
    if (!userCompanyId) {
        setError('Company ID not found. Please log in again.');
        return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('companies')
        .update({ name: companyName.trim(), country: selectedCountry.name })
        .eq('id', userCompanyId);

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

  if (isLoading || loading) { // Show loading screen while session or company data is loading
    return (
        <View style={styles.fullscreenLoading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading company information...</Text>
        </View>
    );
  }

  return (
    <AnimatedScreen backgroundColor={theme.colors.background}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
            <Link href="/(guest)" asChild>
                <Image
                source={require('../../../assets/logokoordblack.png')}
                style={styles.logo}
                resizeMode="contain"
                />
            </Link>
        </View>

        <View style={styles.mainContent}>
            <View style={styles.card}>
                <Text style={styles.title} fontType="bold">Company Setup</Text>
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
                    placeholderTextColor={theme.colors.bodyText}
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
                    style={styles.ctaButton}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaButtonText}>Save Details</Text>}
                </Button>
            </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText} fontType="regular">© {new Date().getFullYear()} WorkHoursTracker. All Rights Reserved</Text>
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    ...Platform.select({
        web: {
          width: '100%',
          maxWidth: 1400,
          alignSelf: 'center',
        },
    }),
  },
  logo: {
    width: 100,
    height: 30,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
  },
  card: {
    width: '100%',
    maxWidth: 500,
    padding: theme.spacing(5),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    alignItems: 'center',
    ...Platform.select({
        web: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
        },
        native: {
            elevation: 6,
        },
    }),
  },
  title: {
    fontSize: isLargeScreen ? 32 : 28,
    color: theme.colors.headingText,
    textAlign: 'center',
    marginBottom: theme.spacing(2),
  },
  description: {
    fontSize: isLargeScreen ? 18 : 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
    maxWidth: 600,
  },
  errorContainer: {
    backgroundColor: theme.colors.errorBackground,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  errorText: {
    color: theme.colors.errorText,
    textAlign: 'center',
    fontWeight: 'bold',
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
    backgroundColor: theme.colors.background, // Changed to background for consistency
  },
  dropdown: {
    height: 50,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: theme.colors.background, // Changed to background for consistency
  },
  placeholderStyle: {
    fontSize: 16,
    color: theme.colors.bodyText, // Changed to bodyText for consistency
  },
  selectedTextStyle: {
    fontSize: 16,
    color: theme.colors.headingText, // Changed to headingText for consistency
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    color: theme.colors.headingText, // Changed to headingText for consistency
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(5),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.lg,
    width: '100%',
    alignItems: 'center',
    marginTop: theme.spacing(2),
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullscreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 18,
    color: theme.colors.bodyText,
    marginTop: theme.spacing(2),
  },
  footer: {
    padding: theme.spacing(5),
    backgroundColor: theme.colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    alignItems: 'center',
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      },
    }),
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.bodyText,
  },
});