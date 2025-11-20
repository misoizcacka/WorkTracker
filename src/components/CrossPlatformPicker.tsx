import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Picker as NativePicker } from '@react-native-picker/picker'; // Import Picker from correct package
import { theme } from '~/theme'; // Using baseUrl alias

interface Option {
  label: string;
  value: string;
}

interface CrossPlatformPickerProps {
  selectedValue: string | null;
  onValueChange: (itemValue: string | null) => void;
  options: Option[];
  placeholder?: string;
}

const CrossPlatformPicker: React.FC<CrossPlatformPickerProps> = ({
  selectedValue,
  onValueChange,
  options,
  placeholder,
}) => {
  if (Platform.OS === 'web') {
    return (
      <select
        style={styles.webPicker}
        value={selectedValue || ''}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else {
    return (
      <View style={styles.nativePickerContainer}>
        <NativePicker
          selectedValue={selectedValue}
          onValueChange={(itemValue: string | null) => onValueChange(itemValue)} // Explicitly type itemValue
          style={styles.nativePicker}
        >
          {placeholder && <NativePicker.Item label={placeholder} value="" enabled={false} />}
          {options.map((option) => (
            <NativePicker.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </NativePicker>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  webPicker: {
    height: 50,
    width: '100%',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    color: theme.colors.bodyText,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.cardBackground,
    fontSize: 16,
  },
  nativePickerContainer: {
    height: 50,
    width: '100%',
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    overflow: 'hidden', // Ensures the picker content stays within bounds
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
  },
  nativePicker: {
    width: '100%',
    height: '100%',
    color: theme.colors.bodyText,
  },
});

export default CrossPlatformPicker;
