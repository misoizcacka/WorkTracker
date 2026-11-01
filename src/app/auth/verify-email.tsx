import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/Themed';
import { Button } from '../../components/Button';
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
      <GuestHeader variant="auth" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isLargeScreen && styles.scrollContentLarge,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, isLargeScreen && styles.cardLarge]}>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="mail-outline" size={32} color={theme.colors.bodyText} />
          </View>

          {/* Title */}
          <Text style={styles.title} fontType="bold">
            {t('verifyEmail.title', 'Check your email')}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle} fontType="regular">
            {t('verifyEmail.description', 'We sent a verification link to')}
          </Text>

          {/* Email address */}
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

          {/* Feedback messages */}
          {resendSuccess && (
            <View style={styles.feedbackRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success} />
              <Text style={styles.feedbackTextSuccess} fontType="regular">
                {t('verifyEmail.resendSuccess', 'Email sent! Check your inbox.')}
              </Text>
            </View>
          )}
          {resendError ? (
            <View style={styles.feedbackRow}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.errorText} />
              <Text style={styles.feedbackTextError} fontType="regular">
                {resendError}
              </Text>
            </View>
          ) : null}

          {/* Primary action */}
          <Button
            title={isChecking
              ? t('verifyEmail.checking', 'Checking...')
              : t('verifyEmail.checkButton', 'I verified my email')}
            onPress={handleCheckManually}
            disabled={isChecking}
            style={styles.primaryButton}
          />

          {/* Secondary actions */}
          <Pressable
            onPress={handleResendEmail}
            disabled={isResending}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
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

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.ghostButton, pressed && styles.ghostButtonPressed]}
          >
            <Text style={styles.ghostButtonText} fontType="regular">
              {t('verifyEmail.changeEmail', 'Wrong email? Go back')}
            </Text>
          </Pressable>

          {/* Help text */}
          <Text style={styles.helpText} fontType="regular">
            {t('verifyEmail.helpText', "Can't find it? Check your spam folder.")}
          </Text>

        </View>
      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: theme.colors.pageBackground,
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(6),
  },
  scrollContentLarge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing(8),
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(4),
  },
  cardLarge: {
    width: '100%',
    maxWidth: 480,
  },

  // Icon
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.pageBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },

  // Title / subtitle
  title: {
    fontSize: 22,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.bodyText,
    marginBottom: 4,
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

  // Steps
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

  // Feedback
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  feedbackTextSuccess: {
    fontSize: 14,
    color: theme.colors.success,
  },
  feedbackTextError: {
    fontSize: 14,
    color: theme.colors.errorText,
    flex: 1,
  },

  // Buttons
  primaryButton: {
    marginBottom: theme.spacing(1.5),
  },
  secondaryButton: {
    paddingVertical: theme.spacing(1.5),
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing(0.5),
  },
  secondaryButtonPressed: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: theme.colors.bodyText,
  },
  ghostButton: {
    paddingVertical: theme.spacing(1.5),
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing(3),
  },
  ghostButtonPressed: {
    opacity: 0.6,
  },
  ghostButtonText: {
    fontSize: 14,
    color: theme.colors.disabledText,
  },

  // Help
  helpText: {
    fontSize: 13,
    color: theme.colors.disabledText,
    textAlign: 'center',
  },
});
