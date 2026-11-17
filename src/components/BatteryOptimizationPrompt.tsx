import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text } from './Themed';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import * as BackgroundLocation from '../../modules/background-location';

interface BatteryOptimizationPromptProps {
  visible: boolean;
  onDismiss: () => void;
  onSettingsOpened: () => void;
}

const BatteryOptimizationPrompt: React.FC<BatteryOptimizationPromptProps> = ({
  visible,
  onDismiss,
  onSettingsOpened
}) => {
  const [manufacturer, setManufacturer] = useState('');

  useEffect(() => {
    if (Platform.OS === 'android') {
      const mfr = BackgroundLocation.getDeviceManufacturer().toLowerCase();
      setManufacturer(mfr);
    }
  }, []);

  const handleOpenSettings = async () => {
    try {
      await BackgroundLocation.openBatteryOptimizationSettings();
      onSettingsOpened();
    } catch (error) {
      console.error('Failed to open battery settings:', error);
    }
  };

  const getInstructions = () => {
    switch (manufacturer) {
      case 'samsung':
        return [
          'Tap "Open Settings" below',
          'Select "Unrestricted" or "Don\'t optimize"',
          'Press back, then go to Battery → Background usage limits',
          'Remove Koordinate from "Sleeping apps" and "Deep sleeping apps"',
        ];
      
      case 'xiaomi':
      case 'redmi':
        return [
          'Tap "Open Settings" below',
          'Select "No restrictions"',
          'Go back to Settings → Battery & performance',
          'Tap "Choose apps" and disable restrictions for Koordinate',
        ];
      
      case 'huawei':
      case 'honor':
        return [
          'Tap "Open Settings" below',
          'Enable "Allow background activity"',
          'Go to Battery → App launch',
          'Find Koordinate and select "Manage manually"',
          'Enable "Auto-launch", "Secondary launch", and "Run in background"',
        ];
      
      case 'oppo':
      case 'realme':
        return [
          'Tap "Open Settings" below',
          'Enable "Allow background activity"',
          'Go to Battery → Battery Saver',
          'Disable battery saver or add Koordinate to exceptions',
        ];
      
      case 'oneplus':
        return [
          'Tap "Open Settings" below',
          'Select "Don\'t optimize"',
          'Go to Battery → Battery optimization',
          'Find Koordinate and select "Don\'t optimize"',
        ];
      
      default:
        return [
          'Tap "Open Settings" below',
          'Select "Unrestricted" or "Don\'t optimize"',
          'This ensures accurate location tracking throughout your shift',
        ];
    }
  };

  const getDeviceName = () => {
    switch (manufacturer) {
      case 'samsung': return 'Samsung';
      case 'xiaomi': return 'Xiaomi';
      case 'redmi': return 'Redmi';
      case 'huawei': return 'Huawei';
      case 'honor': return 'Honor';
      case 'oppo': return 'Oppo';
      case 'realme': return 'Realme';
      case 'oneplus': return 'OnePlus';
      default: return 'Android';
    }
  };

  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="battery-charging" size={32} color={theme.colors.warning} />
            </View>
            <Text style={styles.title} fontType="bold">
              Disable Battery Optimization
            </Text>
            <Text style={styles.subtitle} fontType="regular">
              {getDeviceName()} Setup Required
            </Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description} fontType="regular">
              For accurate work hour tracking, please disable battery optimization for this app:
            </Text>

            <View style={styles.instructionsList}>
              {getInstructions().map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText} fontType="bold">{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText} fontType="regular">
                    {instruction}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.whyBox}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} style={styles.whyIcon} />
              <Text style={styles.whyText} fontType="regular">
                <Text fontType="bold">Why is this needed?</Text> {getDeviceName()} devices aggressively restrict background apps to save battery. Without this setting, your work hours may not be tracked accurately.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onDismiss}
            >
              <Text style={styles.buttonTextSecondary} fontType="medium">Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleOpenSettings}
            >
              <Ionicons name="settings-outline" size={18} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonTextPrimary} fontType="bold">Open Settings</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(2),
  },
  modal: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.xl,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
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
    backgroundColor: theme.colors.warningMuted,
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
  },
  content: {
    padding: theme.spacing(3),
  },
  description: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(3),
    lineHeight: 22,
  },
  instructionsList: {
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: 'white',
    fontSize: theme.fontSizes.sm,
  },
  instructionText: {
    flex: 1,
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
    lineHeight: 22,
    paddingTop: 4,
  },
  whyBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryMuted,
    padding: theme.spacing(2),
    borderRadius: theme.radius.md,
    gap: theme.spacing(1.5),
  },
  whyIcon: {
    marginTop: 2,
  },
  whyText: {
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
  buttonIcon: {
    marginRight: theme.spacing(0.75),
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

export default BatteryOptimizationPrompt;
