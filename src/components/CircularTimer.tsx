import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import { theme } from '../theme';
import { Text } from './Themed';

interface CircularTimerProps {
  elapsedTime: number;
  size: number;
  strokeWidth: number;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({ elapsedTime, size, strokeWidth = 6 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const spinValue = useRef(new Animated.Value(0)).current;

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000, // Slower, smoother rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    return () => spinAnimation.stop();
  }, [spinValue]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={size} height={size}>
          {/* Static Background Ring */}
          <Circle
            stroke={theme.colors.borderColor}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeOpacity={0.2}
          />
          {/* Smooth Rotating Segment */}
          <Circle
            stroke={theme.colors.primary}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeDasharray={`${circumference * 0.15} ${circumference * 0.85}`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      <View style={styles.textContainer}>
        <Text style={styles.timerText} fontType="regular">{formatTime(elapsedTime)}</Text>
        <Text style={styles.label} fontType="medium">ELAPSED TIME</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing(2),
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 38,
    color: theme.colors.headingText,
  },
  label: {
    fontSize: 10,
    color: theme.colors.disabledText,
    letterSpacing: 1.5,
    marginTop: 2,
  },
});