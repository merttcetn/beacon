import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface SideButtonBadge {
  value: string | number;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export interface SideButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  variant?: 'ghost' | 'filled';
  disabled?: boolean;
  size?: number;
  bgColor?: string;
  borderColor?: string;
  iconColor?: string;
  badge?: SideButtonBadge;
}

const GHOST_DEFAULTS = {
  bg: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.32)',
  icon: '#FAF7F2',
};

const FILLED_DEFAULTS = {
  bg: '#FAF7F2',
  border: 'rgba(26,29,36,0.15)',
  icon: '#1F3A5F',
};

export function SideButton({
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  variant = 'ghost',
  disabled,
  size = 56,
  bgColor,
  borderColor,
  iconColor,
  badge,
}: SideButtonProps) {
  const defaults = variant === 'ghost' ? GHOST_DEFAULTS : FILLED_DEFAULTS;
  const finalBg = bgColor ?? defaults.bg;
  const finalBorder = borderColor ?? defaults.border;
  const finalIcon = iconColor ?? defaults.icon;

  const press = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.06 }],
    opacity: disabled ? 0.4 : 1 - press.value * 0.04,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(1, { damping: 16, stiffness: 240 });
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 16, stiffness: 200 });
      }}
      hitSlop={8}
    >
      <Animated.View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            backgroundColor: finalBg,
            borderWidth: variant === 'ghost' ? 1.2 : 1,
            borderColor: finalBorder,
          },
          animStyle,
        ]}
      >
        <Ionicons name={icon} size={size * 0.4} color={finalIcon} />
        {badge ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: badge.bgColor,
                borderColor: badge.borderColor,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: badge.textColor }]}>
              {badge.value}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 99,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
