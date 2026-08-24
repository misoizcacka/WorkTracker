import React from 'react';
import { View, StyleSheet, ScrollView, Platform, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Text } from '../../../components/Themed';
import { GuestHeader } from '~/components/GuestHeader';
import { GuestFooter } from '~/components/GuestFooter';

const { width } = Dimensions.get('window');

export default function PaymentCancel() {
  const router = useRouter();

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <GuestHeader variant="content" />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.mainContent}>
            <Card style={styles.statusCard}>
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.errorBackground }]}>
                    <Text style={styles.statusIcon}>⚠️</Text>
                </View>
                <Text style={styles.title} fontType='bold'>Payment Cancelled</Text>
                <Text style={styles.description} fontType='regular'>
                    Your payment was not completed. No charges were made. You can try again whenever you're ready.
                </Text>
                <Button
                    title="Return to Subscription Setup"
                    onPress={() => router.replace('/subscription/setup')}
                    style={styles.ctaButton}
                />
            </Card>
          </View>
          <GuestFooter />
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
    backgroundColor: '#FFFBEB', // Light yellow/amber
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
  },
  statusIcon: {
    fontSize: 40,
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
