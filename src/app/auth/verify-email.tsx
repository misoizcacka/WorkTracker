import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, useWindowDimensions } from 'react-native';
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
  
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  // Check if email was verified (user clicked link in another tab/device)
  useEffect(() => {
    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email_confirmed_at) {
        // Email verified! Continue to next step
        router.replace('/subscription/setup');
      }
    };

    // Check every 3 seconds
    const interval = setInterval(checkVerification, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const handleResendEmail = async () => {
    if (!email) return;
    
    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        if (error.message.toLowerCase().includes('rate limit')) {
          setResendError(t('verifyEmail.errors.rateLimitExceeded', 'Please wait a few minutes before requesting another email.'));
        } else {
          setResendError(error.message);
        }
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err: any) {
      setResendError(err.message || t('verifyEmail.errors.unknown', 'Failed to resend email.'));
    } finally {
      setIsResending(false);
    }
  };

  const handleChangeEmail = () => {
    // Go back to signup to change email
    router.back();
  };

  const handleCheckManually = async () => {
    setIsChecking(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.email_confirmed_at) {
      router.replace('/subscription/setup');
    } else {
      setResendError(t('verifyEmail.errors.notVerified', 'Email not verified yet. Please check your inbox and click the link.'));
      setTimeout(() => setResendError(''), 5000);
    }
    
    setIsChecking(false);
  };

  return (
    <AnimatedScreen>
      <GuestHeader />
      <View style={[styles.container, isLargeScreen && styles.containerLarge]}>
        <View style={[styles.content, isLargeScreen && styles.contentLarge]}>
          
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={48} color={theme.colors.secondary} />
          </View>

          {/* Title */}
          <Text style={styles.title} fontType="bold">
            {t('verifyEmail.title', 'Check your email')}
          </Text>

          {/* Description */}
          <Text style={styles.description} fontType="regular">
            {t('verifyEmail.description', 'We sent a verification link to:')}
          </Text>

          {/* Email Display */}
          <Card style={styles.emailCard}>
            <Text style={styles.emailText} fontType="medium">
              {email || t('verifyEmail.yourEmail', 'your email address')}
            </Text>
          </Card>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} style={styles.instructionIcon} />
              <Text style={styles.instructionText} fontType="regular">
                {t('verifyEmail.step1', 'Open your email inbox')}
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} style={styles.instructionIcon} />
              <Text style={styles.instructionText} fontType="regular">
                {t('verifyEmail.step2', 'Click the "Verify Email Address" button')}
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} style={styles.instructionIcon} />
              <Text style={styles.instructionText} fontType="regular">
                {t('verifyEmail.step3', 'Return here to continue')}
              </Text>
            </View>
          </View>

          {/* Success Message */}
          {resendSuccess && (
            <View style={styles.successMessage}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.successText} fontType="medium">
                {t('verifyEmail.resendSuccess', 'Email sent! Check your inbox.')}
              </Text>
            </View>
          )}

          {/* Error Message */}
          {resendError && (
            <View style={styles.errorMessage}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.errorText} />
              <Text style={styles.errorText} fontType="regular">
                {resendError}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Button
              title={isChecking ? t('verifyEmail.checking', 'Checking...') : t('verifyEmail.checkButton', 'I verified my email')}
              onPress={handleCheckManually}
              disabled={isChecking}
              style={styles.primaryButton}
            />

            <Pressable 
              onPress={handleResendEmail} 
              disabled={isResending}
              style={styles.linkButton}
            >
              {isResending ? (
                <ActivityIndicator size="small" color={theme.colors.secondary} />
              ) : (
                <Text style={styles.linkButtonText} fontType="medium">
                  {t('verifyEmail.resendButton', 'Resend verification email')}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={handleChangeEmail} style={styles.linkButton}>
              <Text style={styles.linkButtonTextSecondary} fontType="regular">
                {t('verifyEmail.changeEmail', 'Wrong email? Go back')}
              </Text>
            </Pressable>
          </View>

          {/* Help Text */}
          <Text style={styles.helpText} fontType="regular">
            {t('verifyEmail.helpText', "Didn't receive the email? Check your spam folder or try resending.")}
          </Text>

        </View>
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  containerLarge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: theme.spacing(3),
    maxWidth: 600,
  },
  contentLarge: {
    flex: 0,
    width: '100%',
    paddingVertical: theme.spacing(6),
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing(3),
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: theme.spacing(2),
    color: theme.colors.bodyText,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: theme.colors.lightText,
    marginBottom: theme.spacing(2),
  },
  emailCard: {
    backgroundColor: theme.colors.backgroundLight,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  emailText: {
    fontSize: 16,
    textAlign: 'center',
    color: theme.colors.secondary,
  },
  instructionsContainer: {
    marginBottom: theme.spacing(3),
    gap: theme.spacing(2),
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionIcon: {
    marginRight: theme.spacing(1.5),
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.bodyText,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successBackground,
    padding: theme.spacing(2),
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(2),
    gap: theme.spacing(1.5),
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.success,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.errorBackground,
    padding: theme.spacing(2),
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(2),
    gap: theme.spacing(1.5),
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.errorText,
  },
  actionsContainer: {
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  primaryButton: {
    marginTop: theme.spacing(1),
  },
  linkButton: {
    padding: theme.spacing(2),
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 15,
    color: theme.colors.secondary,
  },
  linkButtonTextSecondary: {
    fontSize: 14,
    color: theme.colors.lightText,
  },
  helpText: {
    fontSize: 13,
    textAlign: 'center',
    color: theme.colors.lightText,
    fontStyle: 'italic',
  },
});
