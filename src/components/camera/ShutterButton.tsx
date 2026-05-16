import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

export interface ShutterButtonProps {
  onPress: () => void;
  disabled?: boolean;
  size?: number;
  ringColor?: string;
  coreColor?: string;
  accentColor?: string;
  glowColor?: string;
  recessedColor?: string;
  innerHairlineColor?: string;
  accessibilityLabel?: string;
}

/**
 * Precision-instrument shutter button.
 * Concentric layers: pulsing halo, rotating compass tick ring, white outer ring,
 * recessed dark gap, cream core with sighting crosshair.
 */
export function ShutterButton({
  onPress,
  disabled,
  size = 84,
  ringColor = '#FAF7F2',
  coreColor = '#FAF7F2',
  accentColor = '#1F3A5F',
  glowColor = '#FAF7F2',
  recessedColor = '#11171F',
  innerHairlineColor = 'rgba(26,29,36,0.08)',
  accessibilityLabel = 'Fotoğraf çek',
}: ShutterButtonProps) {
  const tickRingSize = size + 8;
  const ringSize = size - 8;
  const recessedSize = size - 18;
  const coreSize = size - 30;
  const crosshairLen = coreSize * 0.34;
  const tickRadius = ringSize / 2 + 4;
  const tickCircumference = 2 * Math.PI * tickRadius;
  const tickDash = `2 ${tickCircumference / 24 - 2}`;

  const press = useSharedValue(0);
  const glow = useSharedValue(0);
  const tickRotation = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    tickRotation.value = withRepeat(
      withTiming(1, { duration: 60000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [glow, tickRotation]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.08 }],
    opacity: disabled ? 0.5 : 1 - press.value * 0.05,
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + glow.value * 0.32 + press.value * 0.4,
    transform: [{ scale: 1 + glow.value * 0.05 + press.value * 0.18 }],
  }));

  const tickStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tickRotation.value * 360}deg` }],
    opacity: 0.7 - press.value * 0.5,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(1, { damping: 14, stiffness: 220 });
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 14, stiffness: 180 });
      }}
      hitSlop={12}
      style={styles.hitArea}
    >
      <Animated.View
        style={[
          {
            width: size + 24,
            height: size + 24,
            alignItems: 'center',
            justifyContent: 'center',
          },
          containerStyle,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.layer,
            {
              width: tickRingSize + 16,
              height: tickRingSize + 16,
              borderRadius: 999,
              backgroundColor: glowColor,
            },
            haloStyle,
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.layer,
            { width: tickRingSize, height: tickRingSize },
            tickStyle,
          ]}
        >
          <Svg width={tickRingSize} height={tickRingSize}>
            <Circle
              cx={tickRingSize / 2}
              cy={tickRingSize / 2}
              r={tickRadius}
              fill="none"
              stroke={ringColor}
              strokeWidth={1.5}
              strokeDasharray={tickDash}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        <View
          style={[
            styles.layer,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: 999,
              borderWidth: 2.5,
              borderColor: ringColor,
            },
          ]}
        />

        <View
          style={[
            styles.layer,
            {
              width: recessedSize,
              height: recessedSize,
              borderRadius: 999,
              backgroundColor: recessedColor,
            },
          ]}
        />

        <View
          style={[
            styles.layer,
            {
              width: coreSize,
              height: coreSize,
              borderRadius: 999,
              backgroundColor: coreColor,
              borderWidth: 1,
              borderColor: innerHairlineColor,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <View
            style={{
              position: 'absolute',
              width: crosshairLen,
              height: 1.5,
              backgroundColor: accentColor,
              opacity: 0.85,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 1.5,
              height: crosshairLen,
              backgroundColor: accentColor,
              opacity: 0.85,
            }}
          />
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 99,
              backgroundColor: accentColor,
            }}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: { padding: 4 },
  layer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
