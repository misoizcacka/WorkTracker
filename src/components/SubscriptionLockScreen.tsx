import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { Text } from './Themed';
import { Card } from './Card';
import { Button } from './Button';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import { useSession } from '../context/AuthContext';

export const SubscriptionLockScreen = () => {
  const { userCompanyId, signOut, userRole } = useSession();
  const [loading, setLoading] = useState(false);

  const isManagerOrOwner = userRole === 'manager' || userRole === 'owner';

  const handleManageBilling = async () => {
    if (!userCompanyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { companyId: userCompanyId }
      });

      if (error) throw error;
      if (data?.url) {
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          Linking.openURL(data.url);
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load billing portal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <Card style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="card-outline" size={60} color={theme.colors.danger} />
        </View>
        
        <Text style={styles.title} fontType="bold">Subscription Expired</Text>
        
        <Text style={styles.description} fontType="regular">
          {isManagerOrOwner 
            ? "Your company's subscription has expired or the last payment failed. Please update your billing information to continue using the platform."
            : "Your company's subscription has expired. Please contact your manager or company owner to restore access."
          }
        </Text>

        {isManagerOrOwner && (
          <Button
            title="Update Billing Information"
            onPress={handleManageBilling}
            loading={loading}
            disabled={loading}
            style={styles.button}
          />
        )}

        <TouchableOpacity onPress={() => signOut()} style={styles.logoutButton}>
          <Text style={styles.logoutText} fontType="medium">Sign Out</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(3),
  },
  card: {
    width: '100%',
    maxWidth: 450,
    padding: theme.spacing(4),
    alignItems: 'center',
    borderRadius: theme.radius.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.danger + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  title: {
    fontSize: 24,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: theme.colors.bodyText,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing(4),
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: theme.colors.primary,
  },
  logoutButton: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(1),
  },
  logoutText: {
    color: theme.colors.bodyText,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
