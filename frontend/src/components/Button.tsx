import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizePadding: Record<
  Size,
  { vertical: number; horizontal: number; minHeight: number; fontSize: number }
> = {
  sm: { vertical: spacing.s2, horizontal: spacing.s3, minHeight: 36, fontSize: 14 },
  md: { vertical: spacing.s3, horizontal: spacing.s4, minHeight: 48, fontSize: 16 },
  lg: { vertical: spacing.s4, horizontal: spacing.s6, minHeight: 64, fontSize: 18 },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  style,
  ...rest
}: Props) {
  const sz = sizePadding[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical: sz.vertical,
          paddingHorizontal: sz.horizontal,
          minHeight: sz.minHeight,
          backgroundColor: bgFor(variant, pressed, disabled),
          borderColor: borderFor(variant),
          borderWidth: variant === 'ghost' ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textFor(variant)} />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <Text
            style={[
              typography.headingSm,
              { color: textFor(variant), fontSize: sz.fontSize },
            ]}
          >
            {label}
          </Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

function bgFor(variant: Variant, pressed: boolean, disabled?: boolean | null) {
  if (disabled) return colors.bg.secondary;
  switch (variant) {
    case 'primary':
      return pressed ? colors.accent.pressed : colors.accent.primary;
    case 'secondary':
      return pressed ? colors.bg.secondary : colors.bg.elevated;
    case 'ghost':
      return 'transparent';
    case 'danger':
      return pressed ? '#B92C38' : colors.status.new;
  }
}

function borderFor(variant: Variant) {
  return variant === 'ghost' ? colors.border.default : 'transparent';
}

function textFor(variant: Variant) {
  switch (variant) {
    case 'primary':
    case 'danger':
      return colors.text.inverse;
    case 'secondary':
    case 'ghost':
      return colors.text.primary;
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
  },
});
