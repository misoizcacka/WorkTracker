import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '~/theme';

interface TimePickerInputProps {
  value: string;
  onValueChange: (time: string) => void;
  placeholder?: string;
  label?: string;
  style?: any;
  disabled?: boolean;
  error?: string;
}

export function TimePickerInput({
  value,
  onValueChange,
  placeholder,
  label,
  style,
  disabled = false,
  error,
}: TimePickerInputProps) {
  const [show, setShow] = useState(false);

  const parsed = value?.split(':') ?? ['00', '00'];
  const [hour, setHour] = useState(parsed[0]);
  const [minute, setMinute] = useState(parsed[1]);

  const open = () => {
    if (disabled) return;
    const [h, m] = value ? value.split(':') : ['00', '00'];
    setHour(h);
    setMinute(m);
    setShow(true);
  };

  const confirm = () => {
    const hh = hour.padStart(2, '0');
    const mm = minute.padStart(2, '0');
    onValueChange(`${hh}:${mm}`);
    setShow(false);
  };

  const enforceHH = (t: string) => {
    const n = t.replace(/\D/g, '');
    if (n === '') return setHour('');
    let v = Math.min(23, parseInt(n)).toString().padStart(2, '0');
    setHour(v);
  };

  const enforceMM = (t: string) => {
    const n = t.replace(/\D/g, '');
    if (n === '') return setMinute('');
    let v = Math.min(59, parseInt(n)).toString().padStart(2, '0');
    setMinute(v);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.input, style, disabled && styles.disabled]}
        onPress={open}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Text style={value ? styles.text : styles.placeholder}>
          {value || placeholder || 'HH:MM'}
        </Text>
        <Ionicons name="time-outline" size={20} color={theme.colors.iconColor} />
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={show} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>Select Time</Text>

            {/* TIME INPUTS DIRECTLY IN MODAL — EXACTLY WHAT YOU WANT */}
            <View style={styles.timeRow}>
              <TextInput
                value={hour}
                onChangeText={enforceHH}
                maxLength={2}
                keyboardType="numeric"
                style={styles.timeBox}
                placeholder="HH"
                placeholderTextColor={theme.colors.bodyText}
              />
              <Text style={styles.colon}>:</Text>
              <TextInput
                value={minute}
                onChangeText={enforceMM}
                maxLength={2}
                keyboardType="numeric"
                style={styles.timeBox}
                placeholder="MM"
                placeholderTextColor={theme.colors.bodyText}
              />
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShow(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: theme.spacing(1) },
  label: { fontSize: 14, color: theme.colors.bodyText, marginBottom: 6 },

  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    height: 40,
    paddingHorizontal: theme.spacing(1.5),
    justifyContent: 'space-between',
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.borderColor,
  },

  disabled: { opacity: 0.5 },

  text: { fontSize: 16, color: theme.colors.headingText },
  placeholder: { fontSize: 16, color: theme.colors.bodyText },
  error: { fontSize: 12, color: theme.colors.danger, marginTop: 3 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modal: {
    width: '85%',
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing(3),
    borderRadius: theme.radius.md,
  },

  title: {
    fontSize: 18,
    marginBottom: theme.spacing(2),
    textAlign: 'center',
    color: theme.colors.headingText,
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },

  timeBox: {
    width: 70,
    height: 60,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    textAlign: 'center',
    fontSize: 28,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    color: theme.colors.headingText,
  },

  colon: {
    fontSize: 32,
    marginHorizontal: 10,
    color: theme.colors.headingText,
  },

  confirmBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },

  confirmText: {
    color: theme.colors.cardBackground,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },

  cancel: {
    textAlign: 'center',
    color: theme.colors.bodyText,
    marginTop: theme.spacing(1.5),
  },
});
