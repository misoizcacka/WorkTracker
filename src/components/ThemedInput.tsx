// frontend/src/components/ThemedInput.tsx
import React, { useState, forwardRef } from 'react';
import { TextInput, StyleSheet, TextInputProps, Platform, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface ThemedInputProps extends TextInputProps {
  style?: TextInputProps['style']; // Explicitly define style as TextInputProps['style']
}

const ThemedInput = forwardRef<TextInput, ThemedInputProps>(({ style, onFocus, onBlur, ...rest }, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus && onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur && onBlur(e);
  };

  return (
    <TextInput
      ref={ref}
      style={[
        styles.input,
        isFocused && styles.focusedInput,
        style,
      ]}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholderTextColor="#999"
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    width: '100%',
    height: 50,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.headingText,
    backgroundColor: theme.colors.pageBackground,
    // Removed shadow properties from here to match InvitePersonModal
    // ...Platform.select({
    //   ios: {
    //     shadowColor: theme.shadow.soft.shadowColor,
    //     shadowOffset: theme.shadow.soft.shadowOffset,
    //     shadowOpacity: theme.shadow.soft.shadowOpacity,
    //     shadowRadius: theme.shadow.soft.shadowRadius,
    //   },
    //   android: {
    //     elevation: theme.shadow.soft.elevation,
    //   },
    //   web: {
    //     boxShadow: `${theme.shadow.soft.shadowOffset.width}px ${theme.shadow.soft.shadowOffset.height}px ${theme.shadow.soft.shadowRadius}px ${theme.shadow.soft.shadowColor}`,
    //     outlineWidth: 0, // Remove default outline
    //   },
    // }),
  },
  focusedInput: {
    borderColor: theme.colors.primary,
    ...Platform.select({
      web: {
        boxShadow: `0 0 0 3px ${theme.colors.primary}40`, // A subtle focus ring (primary with some transparency)
      },
    }),
  },
});

export default ThemedInput;
