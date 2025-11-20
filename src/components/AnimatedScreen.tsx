import React, { useEffect, ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { theme } from '../theme';

const AnimatedScreen = ({ children, backgroundColor }: { children: ReactNode, backgroundColor?: string }) => {
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
  }, []);

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: backgroundColor || theme.colors.pageBackground }, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

export default AnimatedScreen;

