import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  color: string;
  size?: number;
  duration?: number;
}

export function PulseDot({ color, size = 8, duration = 1600 }: Props) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.25, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity, duration]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      style={[
        styles.wrap,
        { width: size + 8, height: size + 8 },
      ]}
    >
      <Animated.View
        style={[
          styles.glow,
          {
            width: size + 8,
            height: size + 8,
            backgroundColor: color,
            opacity: 0.13,
          },
          style,
        ]}
      />
      <View
        style={[
          styles.dot,
          { width: size, height: size, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', borderRadius: 99 },
  dot: { borderRadius: 99 },
});
