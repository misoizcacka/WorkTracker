import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/Themed';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { theme } from '../../theme';
import AnimatedScreen from '../../components/AnimatedScreen';
import { GuestHeader } from '../../components/GuestHeader';
import { supabase } from '../../utils/supabase';
import { useTranslation } from 'react-i18next';

const BREAKPOINT = 900;

export default function VerifyEmail() {
  const router = useRouter();
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > BREAKPOINT;
  const isMobile = width < 640;

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  // Auto-check every 3 seconds if email was verified
  useEffect(() => {
    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        router.replace('/subscription/setup');
      }
    };
    const interval = setInterval(checkVerification, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResendEmail = async () => {
    if (!email) return;
    setIsResending(true);
    setResendError('');
    setResendSuccess(false);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        if (error.message.toLowerCase().includes('rate limit')) {
          setResendError(t('verifyEmail.errors.rateLimitExceeded'));
        } else {
          setResendError(error.message);
        }
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err: any) {
      setResendError(err.message || t('verifyEmail.errors.unknown'));
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckManually = async () => {
    setIsChecking(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email_confirmed_at) {
      router.replace('/subscription/setup');
    } else {
      setResendError(t('verifyEmail.errors.notVerified'));
      setTimeout(() => setResendError(''), 4000);
    }
    setIsChecking(false);
  };

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <GuestHeader variant="auth" authAction="signin" />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isMobile && styles.scrollContentMobile,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={isMobile ? [styles.card, styles.mobileCard] : styles.card}>

            {/* Icon */}
            <View style={styles.iconWrap}>
              <Ionicons name="mail-outline" size={28} color={theme.colors.bodyText} />
            </View>

            {/* Title */}
            <Text style={styles.title} fontType="bold">
              {t('verifyEmail.title', 'Check your email')}
            </Text>

            {/* Subtitle + email */}
            <Text style={styles.subtitle} fontType="regular">
              {t('verifyEmail.description', 'We sent a verification link to')}
            </Text>
            {email ? (
              <Text style={styles.emailAddress} fontType="medium">
                {email}
              </Text>
            ) : null}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Steps */}
            <View style={styles.steps}>
              {[
                t('verifyEmail.step1', 'Open your email inbox'),
                t('verifyEmail.step2', 'Click "Verify Email Address"'),
                t('verifyEmail.step3', 'Come back here — we\'ll continue automatically'),
              ].map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText} fontType="medium">{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText} fontType="regular">{step}</Text>
                </View>
              ))}
            </View>

            {/* Feedback */}
            {resendSuccess && (
              <View style={styles.feedbackRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success} />
                <Text style={styles.feedbackSuccess} fontType="regular">
                  {t('verifyEmail.resendSuccess', 'Email sent! Check your inbox.')}
                </Text>
              </View>
            )}
            {!!resendError && (
              <View style={styles.feedbackRow}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.colors.errorText} />
                <Text style={styles.feedbackError} fontType="regular">
                  {resendError}
                </Text>
              </View>
            )}

            {/* Primary CTA */}
            <Button
              title={isChecking
                ? t('verifyEmail.checking', 'Checking...')
                : t('verifyEmail.checkButton', 'I verified my email')}
              onPress={handleCheckManually}
              disabled={isChecking}
              style={styles.primaryButton}
            />

            {/* Resend */}
            <Pressable
              onPress={handleResendEmail}
              disabled={isResending}
              style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.6 }]}
            >
              {isResending
                ? <ActivityIndicator size="small" color={theme.colors.bodyText} />
                : (
                  <Text style={styles.secondaryButtonText} fontType="medium">
                    {t('verifyEmail.resendButton', 'Resend email')}
                  </Text>
                )
              }
            </Pressable>

            {/* Go back */}
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.ghostButton, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.ghostButtonText} fontType="regular">
                {t('verifyEmail.changeEmail', 'Wrong email? Go back')}
              </Text>
            </Pressable>

            {/* Help */}
            <Text style={styles.helpText} fontType="regular">
              {t('verifyEmail.helpText', "Can't find it? Check your spam folder.")}
            </Text>

          </Card>
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
    alignItems: 'center',
    padding: theme.spacing(3),
  },
  scrollContentMobile: {
    padding: 0,
    paddingTop: theme.spacing(2),
    justifyContent: 'flex-start',
  },
  card: {
    width: '100%',
    maxWidth: 420,
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
    }),
  },
  mobileCard: {
    borderWidth: 0,
    borderRadius: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: theme.colors.pageBackground,
    maxWidth: '100%',
    padding: theme.spacing(3),
  },

  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.pageBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },

  title: {
    fontSize: 26,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.bodyText,
    marginBottom: 2,
  },
  emailAddress: {
    fontSize: 15,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(3),
  },

  divider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
    marginBottom: theme.spacing(3),
  },

  steps: {
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.pageBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    color: theme.colors.bodyText,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.bodyText,
  },

  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  feedbackSuccess: {
    fontSize: 14,
    color: theme.colors.success,
    flex: 1,
  },
  feedbackError: {
    fontSize: 14,
    color: theme.colors.errorText,
    flex: 1,
  },

  primaryButton: {
    marginBottom: theme.spacing(1.5),
  },
  secondaryButton: {
    paddingVertical: theme.spacing(1.5),
    alignItems: 'center',
    marginBottom: theme.spacing(0.5),
  },
  secondaryButtonText: {
    fontSize: 15,
    color: theme.colors.bodyText,
  },
  ghostButton: {
    paddingVertical: theme.spacing(1.5),
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  ghostButtonText: {
    fontSize: 14,
    color: theme.colors.disabledText,
  },
  helpText: {
    fontSize: 13,
    color: theme.colors.disabledText,
    textAlign: 'center',
  },
});
