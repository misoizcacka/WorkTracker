import React, { useState, useContext, useEffect } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, ScrollView, Platform, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { useSession } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { Dropdown } from 'react-native-element-dropdown';
import { countries } from '../../utils/countries';
import { Text } from '../../components/Themed';
import Logo from '../../../assets/koordlogoblack1.svg';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 900;

export default function CompanySetup() {
  const router = useRouter();
  const { user, session, refreshUser, isLoading, userCompanyId } = useSession();

  const [companyName, setCompanyName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<{ name: string; emoji: string, code: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !session) {
      router.replace('/(guest)/login');
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

  if (isLoading || loading) {
    return (
        <View style={styles.fullscreenLoading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText} fontType="regular">Loading company information...</Text>
        </View>
    );
  }

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        {/* Header with Logo in top left */}
        <View style={styles.header}>
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.mainContent}>
            <Card style={styles.setupCard}>
              <Text style={styles.title} fontType="bold">Company Setup</Text>
              <Text style={styles.description} fontType="regular">
                Finalize your company details to get started with your account.
              </Text>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText} fontType="regular">{error}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label} fontType="medium">Company Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Koord Tech"
                  value={companyName}
                  onChangeText={setCompanyName}
                  autoCapitalize="words"
                  placeholderTextColor={theme.colors.disabledText}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label} fontType="medium">Country *</Text>
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
                  placeholder="Select Country"
                  searchPlaceholder="Search..."
                  value={selectedCountry?.code}
                  onChange={item => setSelectedCountry(item)}
                  renderLeftIcon={() => (
                    <Text style={{ marginRight: 10, fontSize: 18 }}>{selectedCountry?.emoji}</Text>
                  )}
                  containerStyle={styles.dropdownContainer}
                  itemTextStyle={styles.dropdownItemText}
                  selectedTextProps={{ fontType: 'regular' } as any}
                />
              </View>
              
              <Button
                onPress={handleSaveCompanyDetails}
                disabled={loading}
                style={styles.ctaButton}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaButtonText} fontType="regular">Complete Setup</Text>
                )}
              </Button>
            </Card>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText} fontType="regular">© {new Date().getFullYear()} Koord. All Rights Reserved</Text>
        </View>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: theme.spacing(4),
    zIndex: 10,
  },
  logo: {
    width: 120,
    height: 36,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing(3),
    paddingTop: theme.spacing(12),
    paddingBottom: theme.spacing(8),
  },
  mainContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  setupCard: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.xl,
    padding: theme.spacing(5),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      native: {
        elevation: 10,
      },
    }),
  },
  title: {
    fontSize: 28,
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
    backgroundColor: theme.colors.errorBackground,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.errorText,
    width: '100%',
  },
  errorText: {
    color: theme.colors.errorText,
    textAlign: 'center',
    fontSize: 14,
  },
  inputGroup: {
    width: '100%',
    marginBottom: theme.spacing(2.5),
  },
  label: {
    fontSize: 14,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
    marginLeft: 4,
  },
  input: {
    height: 52,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.headingText,
    backgroundColor: theme.colors.background,
  },
  dropdown: {
    height: 52,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.background,
  },
  dropdownContainer: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  dropdownItemText: {
    color: theme.colors.headingText,
    fontSize: 16,
  },
  placeholderStyle: {
    fontSize: 16,
    color: theme.colors.disabledText,
  },
  selectedTextStyle: {
    fontSize: 16,
    color: theme.colors.headingText,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    color: theme.colors.headingText,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    width: '100%',
    height: 52,
    justifyContent: 'center',
    marginTop: theme.spacing(2),
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 16,
  },
  fullscreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.bodyText,
    marginTop: theme.spacing(2),
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(3),
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.disabledText,
  },
});
