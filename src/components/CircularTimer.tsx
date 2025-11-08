import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import { theme } from '../theme';

interface CircularTimerProps {
  elapsedTime: number;
  size: number;
  strokeWidth: number;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({ elapsedTime, size, strokeWidth = 5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const spinValue = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(new Animated.Value(0)).current;
  const circleRef = useRef<any>(null);

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
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    progressValue.addListener((progress) => {
      if (circleRef.current) {
        const strokeDashoffset = circumference - (circumference * progress.value * 0.25);
        circleRef.current.setNativeProps({ strokeDashoffset: strokeDashoffset.toString() });
      }
    });

    const progressAnimation = Animated.timing(progressValue, {
      toValue: 1,
      duration: 1000, // Adjust duration for desired speed of progress effect
      easing: Easing.linear,
      useNativeDriver: false, // setNativeProps requires this to be false
    });
    progressAnimation.start();

    return () => {
      spinAnimation.stop();
      progressValue.removeAllListeners();
    };
  }, []);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={size} height={size}>
          <Circle
            stroke={theme.colors.lightBorder}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <AnimatedCircle
            ref={circleRef}
            stroke={theme.colors.primary}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      <View style={styles.textContainer}>
        <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'normal',
    color: theme.colors.primary,
  },
});