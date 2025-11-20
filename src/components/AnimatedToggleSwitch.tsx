import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { theme } from '../theme';

interface AnimatedToggleSwitchProps {
  isOn: boolean;
  onToggle: (newValue: boolean) => void;
  activeColor?: string;
  inactiveColor?: string;
  toggleActiveColor?: string;
  toggleInactiveColor?: string;
  label?: string;
  disabled?: boolean;
}

const AnimatedToggleSwitch: React.FC<AnimatedToggleSwitchProps> = ({
  isOn,
  onToggle,
  activeColor = theme.colors.primary,
  inactiveColor = theme.colors.borderColor,
  toggleActiveColor = theme.colors.pageBackground,
  toggleInactiveColor = theme.colors.pageBackground,
  label,
  disabled = false,
}) => {
  const animation = useRef(new Animated.Value(isOn ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isOn ? 1 : 0,
      duration: 200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [isOn, animation]);

  const handleToggle = () => {
    if (!disabled) {
      onToggle(!isOn);
    }
  };

  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22], // Adjust these values based on toggle size and track padding
  });

  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  return (
    <TouchableOpacity
      onPress={handleToggle}
      activeOpacity={0.8}
      style={[styles.container, disabled && styles.disabledContainer]}
      disabled={disabled}
    >
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View
          style={[
            styles.toggle,
            {
              transform: [{ translateX }],
              backgroundColor: isOn ? toggleActiveColor : toggleInactiveColor,
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  disabledContainer: {
    opacity: 0.6,
  },
  label: {
    marginRight: 10,
    fontSize: 16,
    color: theme.colors.bodyText,
  },
  track: {
    width: 46, // Width of the entire switch track
    height: 24, // Height of the entire switch track
    borderRadius: 12, // Half of height for rounded ends
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggle: {
    width: 20, // Width of the toggle circle
    height: 20, // Height of the toggle circle
    borderRadius: 10, // Half of width/height for a perfect circle
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 3, // Android shadow
  },
});

export default AnimatedToggleSwitch;