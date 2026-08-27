import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Text } from '../../../components/Themed';
import { GuestHeader } from '~/components/GuestHeader';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentCancel() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <GuestHeader variant="content" />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.mainContent}>
            <Card style={styles.statusCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="warning-outline" size={40} color="#D97706" />
                </View>
                <Text style={styles.title} fontType='bold'>{t('payment.cancelTitle')}</Text>
                <Text style={styles.description} fontType='regular'>
                    {t('payment.cancelDescription')}
                </Text>
                <Button
                    title={t('payment.returnToSetup')}
                    onPress={() => router.replace('/subscription/setup')}
                    style={styles.ctaButton}
                />
            </Card>
          </View>
        </ScrollView>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing(3),
    paddingBottom: theme.spacing(8),
  },
  mainContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  statusCard: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.xl,
    padding: theme.spacing(5),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    alignItems: 'center',
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
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
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
    lineHeight: 24,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    width: '100%',
    height: 52,
    justifyContent: 'center',
  },
});
