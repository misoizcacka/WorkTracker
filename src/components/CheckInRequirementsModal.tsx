import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { Text } from './Themed';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as BackgroundLocation from '../../modules/background-location';
import { useTranslation } from 'react-i18next';

interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'checking' | 'granted' | 'denied';
  icon: keyof typeof Ionicons.glyphMap;
  action?: () => Promise<void>;
}

interface CheckInRequirementsModalProps {
  visible: boolean;
  onDismiss: () => void;
  onAllRequirementsMet: () => void;
}

const CheckInRequirementsModal: React.FC<CheckInRequirementsModalProps> = ({
  visible,
  onDismiss,
  onAllRequirementsMet
}) => {
  const { t } = useTranslation();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [checking, setChecking] = useState(false);
  const appState = useRef(AppState.currentState);

  const checkAllRequirements = async () => {
    setChecking(true);

    const reqs: Requirement[] = [
      {
        id: 'location_foreground',
        title: t('worker.permissions.locationForeground'),
        description: t('worker.permissions.locationForegroundDesc'),
        status: 'checking',
        icon: 'location',
      },
      {
        id: 'location_background',
        title: t('worker.permissions.locationBackground'),
        description: t('worker.permissions.locationBackgroundDesc'),
        status: 'checking',
        icon: 'navigate',
      },
      {
        id: 'notifications',
        title: t('worker.permissions.notifications'),
        description: t('worker.permissions.notificationsDesc'),
        status: 'checking',
        icon: 'notifications',
      },
    ];

    if (Platform.OS === 'android') {
      reqs.push({
        id: 'battery',
        title: t('worker.permissions.batteryOptimization'),
        description: t('worker.permissions.batteryOptimizationDesc'),
        status: 'checking',
        icon: 'battery-charging',
      });
    }

    setRequirements(reqs);

    // Check location permissions
    try {
      const foreground = await Location.getForegroundPermissionsAsync();
      reqs[0].status = foreground.granted ? 'granted' : 'denied';
      reqs[0].action = async () => {
        const result = await Location.requestForegroundPermissionsAsync();
        if (result.granted) {
          await checkAllRequirements();
        }
      };

      const background = await Location.getBackgroundPermissionsAsync();
      reqs[1].status = background.granted ? 'granted' : 'denied';
      reqs[1].action = async () => {
        const result = await Location.requestBackgroundPermissionsAsync();
        if (result.granted) {
          await checkAllRequirements();
        }
      };

      // Check notification permission
      const notif = await Notifications.getPermissionsAsync();
      reqs[2].status = notif.granted ? 'granted' : 'denied';
      reqs[2].action = async () => {
        const result = await Notifications.requestPermissionsAsync();
        if (result.granted) {
          await checkAllRequirements();
        }
      };

      // Check battery optimization (Android only)
      if (Platform.OS === 'android') {
        const batteryOptDisabled = BackgroundLocation.isBatteryOptimizationDisabled();
        reqs[3].status = batteryOptDisabled ? 'granted' : 'denied';
        reqs[3].action = async () => {
          await BackgroundLocation.openBatteryOptimizationSettings();
          // Recheck will happen when app comes back to foreground via AppState listener
        };
      }

      setRequirements([...reqs]);
      setChecking(false);

      // Check if all are granted
      const allGranted = reqs.every(r => r.status === 'granted');
      if (allGranted) {
        onAllRequirementsMet();
      }
    } catch (error) {
      console.error('Error checking requirements:', error);
      setChecking(false);
    }
  };

  // Recheck permissions when app comes back to foreground (user returns from settings)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active' && visible) {
        // App came to foreground - recheck all permissions
        console.log('App came to foreground, rechecking permissions...');
        checkAllRequirements();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      checkAllRequirements();
    }
  }, [visible]);

  const getStatusIcon = (status: Requirement['status']) => {
    switch (status) {
      case 'checking':
        return <ActivityIndicator size="small" color={theme.colors.primary} />;
      case 'granted':
        return <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />;
      case 'denied':
        return <Ionicons name="close-circle" size={24} color={theme.colors.danger} />;
      default:
        return <Ionicons name="help-circle" size={24} color={theme.colors.bodyText} />;
    }
  };

  const allGranted = requirements.length > 0 && requirements.every(r => r.status === 'granted');
  const hasAnyDenied = requirements.some(r => r.status === 'denied');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.title} fontType="bold">
              {t('worker.permissions.setupRequired')}
            </Text>
            <Text style={styles.subtitle} fontType="regular">
              {t('worker.permissions.setupSubtitle')}
            </Text>
          </View>

          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {requirements.map((req) => (
              <View key={req.id} style={styles.requirementItem}>
                <View style={styles.requirementIconContainer}>
                  <Ionicons name={req.icon} size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.requirementTextContainer}>
                  <Text style={styles.requirementTitle} fontType="medium">
                    {req.title}
                  </Text>
                  <Text style={styles.requirementDescription} fontType="regular">
                    {req.description}
                  </Text>
                </View>
                <View style={styles.requirementStatus}>
                  {getStatusIcon(req.status)}
                </View>
                {req.status === 'denied' && req.action && (
                  <TouchableOpacity
                    style={styles.requirementAction}
                    onPress={req.action}
                  >
                    <Text style={styles.requirementActionText} fontType="medium">{t('worker.permissions.grant')}</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {allGranted && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} style={styles.successIcon} />
                <Text style={styles.successTitle} fontType="bold">{t('worker.permissions.allSet')}</Text>
                <Text style={styles.successText} fontType="regular">
                  {t('worker.permissions.allSetDesc')}
                </Text>
              </View>
            )}

            {hasAnyDenied && !checking && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={theme.colors.primary} style={styles.infoIcon} />
                <Text style={styles.infoText} fontType="regular">
                  <Text fontType="bold">{t('worker.permissions.whyNeeded')}</Text> {t('worker.permissions.whyNeededDesc')}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            {!allGranted && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={onDismiss}
              >
                <Text style={styles.buttonTextSecondary} fontType="medium">{t('common.cancel')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={allGranted ? onAllRequirementsMet : checkAllRequirements}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.buttonTextPrimary} fontType="bold">
                    {allGranted ? t('worker.permissions.continueCheckIn') : t('worker.permissions.refreshStatus')}
                  </Text>
                  {allGranted && <Ionicons name="arrow-forward" size={18} color="white" style={styles.buttonIcon} />}
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '85%',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      native: {
        elevation: 12,
      },
    }),
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(2),
  },
  title: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  subtitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    textAlign: 'center',
  },
  content: {
    padding: theme.spacing(3),
  },
  contentContainer: {
    paddingBottom: theme.spacing(6), // Ensure content doesn't overlap with action buttons
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    padding: theme.spacing(2),
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  requirementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing(2),
  },
  requirementTextContainer: {
    flex: 1,
  },
  requirementTitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.25),
  },
  requirementDescription: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  requirementStatus: {
    marginLeft: theme.spacing(1),
  },
  requirementAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary, // Black like other buttons
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1.25),
    borderRadius: theme.radius.md,
    marginLeft: theme.spacing(1.5),
    gap: theme.spacing(0.5),
  },
  requirementActionText: {
    color: 'white',
    fontSize: theme.fontSizes.sm,
  },
  successBox: {
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: theme.spacing(3),
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing(2),
  },
  successIcon: {
    marginBottom: theme.spacing(1),
  },
  successTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.success,
    marginBottom: theme.spacing(0.5),
  },
  successText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryMuted,
    padding: theme.spacing(2),
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
    gap: theme.spacing(1.5),
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: theme.spacing(3),
    gap: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2),
    borderRadius: theme.radius.md,
    minHeight: 48,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.pageBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.borderColor,
    opacity: 0.5,
  },
  buttonIcon: {
    marginLeft: theme.spacing(0.75),
  },
  buttonTextPrimary: {
    color: 'white',
    fontSize: theme.fontSizes.md,
  },
  buttonTextSecondary: {
    color: theme.colors.headingText,
    fontSize: theme.fontSizes.md,
  },
});

export default CheckInRequirementsModal;
