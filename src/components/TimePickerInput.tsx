import React, { useState } from 'react';
import { TextInput, TouchableOpacity, Text, StyleSheet, Platform, Modal, View, ViewStyle } from 'react-native';
import { theme } from '~/theme'; // Restore theme import
import { Ionicons } from '@expo/vector-icons'; // Restore Ionicons import

// ...

interface TimePickerInputProps {
  value: string;
  onValueChange: (time: string) => void;
  placeholder?: string;
  label?: string;
  style?: ViewStyle; // Add style prop
}

export function TimePickerInput({ value, onValueChange, placeholder, label }: TimePickerInputProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleTimeChange = (text: string) => {
    // Basic validation for HH:MM format
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(text) || text === '') {
      onValueChange(text);
    }
  };

  const renderWebTimeInput = () => (
    <TextInput
      style={styles.formInput}
      placeholder={placeholder || "HH:MM"}
      placeholderTextColor={theme.colors.bodyText}
      value={value}
      onChangeText={handleTimeChange}
      keyboardType="numbers-and-punctuation"
      maxLength={5}
    />
  );

  const renderNativeTimePicker = () => (
    <TouchableOpacity style={styles.formInput} onPress={() => setShowPicker(true)}>
      <Text style={value ? styles.timeText : styles.placeholderText}>
        {value || placeholder || "HH:MM"}
      </Text>
      <Ionicons name="time-outline" size={20} color={theme.colors.iconColor} />
    </TouchableOpacity>
  );

  return (
    <View>
      {label && <Text style={styles.formLabel}>{label}</Text>}
      {Platform.OS === 'web' ? renderWebTimeInput() : renderNativeTimePicker()}

      {Platform.OS !== 'web' && showPicker && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setShowPicker(false)}
          >
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerPlaceholderText}>Native Time Picker Here</Text>
              {/* Example: <DateTimePicker value={new Date()} mode="time" display="default" onChange={(event, date) => { if (date) onValueChange(date.toTimeString().slice(0, 5)); setShowPicker(false); }} /> */}
              <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowPicker(false)}>
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  formLabel: {
    fontSize: 14,
    color: theme.colors.bodyText,
    marginBottom: theme.spacing(0.5),
    marginTop: theme.spacing(1),
  },
  formInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(1.5),
    backgroundColor: theme.colors.accent,
  },
  timeText: {
    flex: 1,
    color: theme.colors.headingText,
  },
  placeholderText: {
    flex: 1,
    color: theme.colors.bodyText,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    padding: theme.spacing(3),
    alignItems: 'center',
  },
  pickerPlaceholderText: {
    fontSize: 18,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(2),
  },
  closeModalButton: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
  },
  closeModalButtonText: {
    color: theme.colors.cardBackground,
    fontWeight: 'bold',
  },
});
