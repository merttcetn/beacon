import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const BAR_COUNT = 23;
const HIGHLIGHT_EVERY = 4;
const MIN_SCALE = 0.16;
const GAIN = 0.84;
const METER_FLOOR_DB = -50;
const BAR_PHASE_STEP = 0.18;
const CENTER = (BAR_COUNT - 1) / 2;

export type WaveformMode = 'idle' | 'listening' | 'speaking';

interface WaveformProps {
  mode: WaveformMode;
  metering?: number | null;
}

interface BarProps {
  index: number;
  baseHeight: number;
  highlighted: boolean;
  level: SharedValue<number>;
  clock: SharedValue<number>;
}

function Bar({ index, baseHeight, highlighted, level, clock }: BarProps) {
  const phaseOffset = index * BAR_PHASE_STEP;
  const microFreq = 2.4 + (index % 5) * 0.27;
  const variation = 0.72 + Math.abs(Math.sin(index * 1.7)) * 0.42;
  const highlightBoost = highlighted ? 1.12 : 1.0;
  const centerLag = Math.abs(index - CENTER) * 0.035;

  const animated = useAnimatedStyle(() => {
    const t = clock.value - centerLag;
    const microWave = 0.82 + 0.18 * Math.sin(t * microFreq + phaseOffset);
    const idleWiggle = 0.04 * Math.sin(t * 1.3 + phaseOffset * 0.6);
    const scaled = level.value * GAIN * variation * highlightBoost * microWave + idleWiggle;
    const scaleY = MIN_SCALE + Math.max(0, scaled);

    if (highlighted) {
      const color = interpolateColor(
        level.value,
        [0, 1],
        ['#5BD4B9', '#D5F8E8'],
      );
      return {
        transform: [{ scaleY }],
        backgroundColor: color,
      };
    }
    return {
      transform: [{ scaleY }],
      opacity: 0.5 + level.value * 0.45,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bar,
        { height: baseHeight },
        highlighted ? styles.barHighlighted : styles.barPlain,
        animated,
      ]}
    />
  );
}

export function Waveform({ mode, metering }: WaveformProps) {
  const level = useSharedValue(0.22);
  const clock = useSharedValue(0);
  const smoothedRef = useRef(0.22);

  useFrameCallback((info) => {
    'worklet';
    const dt = (info.timeSincePreviousFrame ?? 16) / 1000;
    clock.value += dt;
  }, true);

  const speakingFrame = useFrameCallback((info) => {
    'worklet';
    const t = clock.value;
    const syllable =
      0.5 +
      0.26 * Math.sin(t * 6.1) +
      0.2 * Math.sin(t * 2.7 + 1.1) +
      0.09 * Math.sin(t * 14.3);
    const emphasis = 0.85 + 0.18 * Math.sin(t * 0.45 + 2.1);
    const value = syllable * emphasis;
    level.value = Math.max(0.3, Math.min(0.98, value));
  }, false);

  useEffect(() => {
    cancelAnimation(level);
    speakingFrame.setActive(false);

    if (mode === 'idle') {
      level.value = withRepeat(
        withTiming(0.3, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else if (mode === 'speaking') {
      speakingFrame.setActive(true);
    } else {
      level.value = withTiming(0.34, { duration: 220 });
      smoothedRef.current = 0.28;
    }

    return () => {
      speakingFrame.setActive(false);
    };
  }, [mode, level, speakingFrame]);

  useEffect(() => {
    if (mode !== 'listening') return;
    if (metering == null) return;
    const clamped = Math.max(METER_FLOOR_DB, Math.min(0, metering));
    const raw = (clamped - METER_FLOOR_DB) / -METER_FLOOR_DB;
    const target = Math.max(0.28, raw);
    smoothedRef.current = smoothedRef.current * 0.6 + target * 0.4;
    level.value = withTiming(smoothedRef.current, { duration: 110 });
  }, [metering, mode, level]);

  const bars = Array.from({ length: BAR_COUNT }).map((_, i) => ({
    h: 18 + Math.abs(Math.sin((i + 1) * 1.7)) * 88,
    highlighted: i % HIGHLIGHT_EVERY === 0,
  }));

  return (
    <View style={styles.row}>
      {bars.map((b, i) => (
        <Bar
          key={i}
          index={i}
          baseHeight={b.h}
          highlighted={b.highlighted}
          level={level}
          clock={clock}
        />
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
  barPlain: { backgroundColor: 'rgba(255,255,255,0.85)' },
  barHighlighted: { backgroundColor: '#5BD4B9' },
});
