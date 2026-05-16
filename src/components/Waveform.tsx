import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const BAR_COUNT = 23;
const HIGHLIGHT_EVERY = 4;

interface BarProps {
  baseHeight: number;
  delay: number;
  highlighted: boolean;
}

function Bar({ baseHeight, delay, highlighted }: BarProps) {
  const scale = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [delay, scale]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height: baseHeight,
          backgroundColor: highlighted ? '#5BD4B9' : 'rgba(255,255,255,0.85)',
        },
        animated,
      ]}
    />
  );
}

export function Waveform() {
  const bars = Array.from({ length: BAR_COUNT }).map((_, i) => ({
    h: 18 + Math.abs(Math.sin((i + 1) * 1.7)) * 88,
    delay: i * 60,
    highlighted: i % HIGHLIGHT_EVERY === 0,
  }));

  return (
    <View style={styles.row}>
      {bars.map((b, i) => (
        <Bar key={i} baseHeight={b.h} delay={b.delay} highlighted={b.highlighted} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 120,
  },
  bar: { width: 5, borderRadius: 99 },
});
