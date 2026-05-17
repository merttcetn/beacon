import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { GlassSurface } from '@/components/GlassSurface';
import { colors, fontFamily } from '@/theme';

type Variant = 'centered' | 'inline' | 'pill';

interface Props {
  size?: number;
  color?: string;
  caption?: string;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}

export function Loader({
  size = 28,
  color = colors.accent.primary,
  caption,
  variant = 'centered',
  style,
}: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.linear }),
      -1,
    );
  }, [progress]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 360}deg` }],
  }));

  const ring = (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: Math.max(2, size / 12),
            borderColor: color + '22',
            borderTopColor: color,
          },
          ringStyle,
        ]}
      />
    </View>
  );

  if (variant === 'inline') {
    return <View style={style}>{ring}</View>;
  }

  if (variant === 'pill') {
    return (
      <GlassSurface variant="light" intensity={50} radius={99} style={[styles.pillBase, style]}>
        <View style={styles.pillContent}>
          {ring}
          {caption ? <Text style={styles.pillText}>{caption}</Text> : null}
        </View>
      </GlassSurface>
    );
  }

  return (
    <View style={[styles.centered, style]}>
      {ring}
      {caption ? <Text style={styles.captionText}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 48,
  },
  captionText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: colors.text.tertiary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  pillBase: {
    alignSelf: 'center',
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pillText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: colors.text.primary,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
});
