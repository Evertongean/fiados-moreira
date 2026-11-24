import { useEffect } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';

export interface SkeletonProps {
  width?: ViewStyle['width'];
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const { tokens } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.42);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.58;
      return;
    }

    opacity.value = withRepeat(withTiming(0.82, { duration: 850 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: radius ?? tokens.radius.sm,
          backgroundColor: tokens.colors.disabled,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: { overflow: 'hidden' },
});
