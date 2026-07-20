import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Themed';
import { Card } from './Card';
import { Button } from './Button';
import { theme } from '../theme';

const QUICK_SELECT = [0, 15, 30, 45, 60];
const DEFAULT_BREAK_MINUTES = 30;

interface BreakDurationModalProps {
  visible: boolean;
  workedMinutes: number;        // total worked time in minutes
  onConfirm: (breakMinutes: number) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const BreakDurationModal: React.FC<BreakDurationModalProps> = ({
  visible,
  workedMinutes,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [inputValue, setInputValue] = useState(String(DEFAULT_BREAK_MINUTES));

  // Reset to default each time modal opens
  useEffect(() => {
    if (visible) {
      setInputValue(String(DEFAULT_BREAK_MINUTES));
    }
  }, [visible]);

  const breakMinutes = useMemo(() => {
    const parsed = parseInt(inputValue, 10);
    return isNaN(parsed) ? null : parsed;
  }, [inputValue]);

  const payableMinutes = useMemo(() => {
    if (breakMinutes === null) return null;
    return workedMinutes - breakMinutes;
  }, [workedMinutes, breakMinutes]);

  const validationError = useMemo(() => {
    if (inputValue === '' || inputValue === null) return 'Please enter break duration.';
    if (breakMinutes === null || isNaN(breakMinutes)) return 'Please enter break duration.';
    if (breakMinutes < 0) return 'Break duration cannot be negative.';
    if (breakMinutes > workedMinutes) return 'Break duration cannot exceed worked time.';
    return null;
  }, [inputValue, breakMinutes, workedMinutes]);

  const isValid = validationError === null && breakMinutes !== null;

  const handleInputChange = (text: string) => {
    // Strip non-numeric characters — only whole numbers allowed
    const cleaned = text.replace(/[^0-9]/g, '');
    setInputValue(cleaned);
  };

  const handleQuickSelect = (minutes: number) => {
    setInputValue(String(minutes));
  };

  const handleConfirm = () => {
    if (!isValid || breakMinutes === null) return;
    onConfirm(breakMinutes);
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <Card style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title} fontType="bold">Break Duration</Text>
                <Text style={styles.subtitle}>How long did you take a break?</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onCancel} disabled={isLoading}>
                <Ionicons name="close" size={22} color={theme.colors.bodyText} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              {/* Numeric input */}
              <Text style={styles.inputLabel} fontType="bold">Break duration (minutes)</Text>
              <View style={[styles.inputWrapper, validationError && styles.inputWrapperError]}>
                <TextInput
                  style={styles.input}
                  value={inputValue}
                  onChangeText={handleInputChange}
                  keyboardType="number-pad"
                  maxLength={4}
                  selectTextOnFocus
                  placeholderTextColor={theme.colors.disabledText}
                  editable={!isLoading}
                />
                <Text style={styles.inputSuffix}>min</Text>
              </View>
              {validationError ? (
                <Text style={styles.errorText}>{validationError}</Text>
              ) : null}

              {/* Quick select */}
              <Text style={styles.quickLabel} fontType="bold">Quick Select</Text>
              <View style={styles.quickRow}>
                {QUICK_SELECT.map(val => {
                  const isSelected = inputValue === String(val);
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[styles.quickButton, isSelected && styles.quickButtonSelected]}
                      onPress={() => handleQuickSelect(val)}
                      disabled={isLoading}
                    >
                      <Text
                        style={[styles.quickButtonText, isSelected && styles.quickButtonTextSelected]}
                        fontType={isSelected ? 'bold' : 'regular'}
                      >
                        {val}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Live summary */}
              <View style={styles.summary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Worked time</Text>
                  <Text style={styles.summaryValue} fontType="medium">
                    {formatDuration(workedMinutes)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Break time</Text>
                  <Text style={styles.summaryValue} fontType="medium">
                    {breakMinutes !== null && breakMinutes >= 0 ? formatDuration(breakMinutes) : '—'}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryRowPayable]}>
                  <Text style={styles.payableLabel} fontType="bold">Payable time</Text>
                  <Text
                    style={[
                      styles.payableValue,
                      { color: isValid ? theme.colors.primary : theme.colors.disabledText },
                    ]}
                    fontType="bold"
                  >
                    {isValid && payableMinutes !== null ? formatDuration(payableMinutes) : '—'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                disabled={isLoading}
              >
                <Text style={styles.cancelText} fontType="medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, (!isValid || isLoading) && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                disabled={!isValid || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmText} fontType="bold">Confirm Checkout</Text>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
  },
  card: {
    padding: 0,
    borderRadius: 0,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.cardBackground,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.colors.borderColor,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  title: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.headingText,
  },
  subtitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: theme.colors.pageBackground,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: theme.spacing(3),
    gap: theme.spacing(2),
  },
  inputLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: theme.spacing(0.5),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    height: 52,
  },
  inputWrapperError: {
    borderColor: theme.colors.danger,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.headingText,
    height: '100%',
  },
  inputSuffix: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    marginLeft: 8,
  },
  errorText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.danger,
    marginTop: -theme.spacing(1),
  },
  quickLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: theme.spacing(0.5),
  },
  quickRow: {
    flexDirection: 'row',
    gap: theme.spacing(1),
  },
  quickButton: {
    flex: 1,
    height: 40,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  quickButtonSelected: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  quickButtonText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  quickButtonTextSelected: {
    color: theme.colors.primary,
  },
  summary: {
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(2),
    gap: theme.spacing(1),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowPayable: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
    paddingTop: theme.spacing(1),
    marginTop: theme.spacing(0.5),
  },
  summaryLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.bodyText,
  },
  summaryValue: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
  },
  payableLabel: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
  },
  payableValue: {
    fontSize: theme.fontSizes.md,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    padding: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  cancelText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
  confirmButton: {
    flex: 2,
    height: 50,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.danger,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
  },
});

export default BreakDurationModal;
