import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface GlassSurfaceProps {
  children?: ReactNode;
  variant?: 'light' | 'dark';
  intensity?: number;
  tintOpacity?: number;
  radius?: number;
  highlight?: boolean;
  border?: boolean;
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GlassSurface({
  children,
  variant = 'light',
  intensity = 45,
  tintOpacity,
  radius = 14,
  highlight = true,
  border = true,
  shadow = true,
  style,
}: GlassSurfaceProps) {
  const isDark = variant === 'dark';
  const resolvedTintOpacity = tintOpacity ?? (isDark ? 0.55 : 0.42);

  return (
    <View
      style={[
        styles.base,
        {
          borderRadius: radius,
          backgroundColor: isDark ? 'rgba(17,23,31,0.18)' : 'rgba(255,255,255,0.18)',
        },
        border && {
          borderWidth: 1,
          borderColor: isDark
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(255,255,255,0.55)',
        },
        shadow && (isDark ? styles.shadowDark : styles.shadowLight),
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: isDark
              ? `rgba(17,23,31,${resolvedTintOpacity})`
              : `rgba(248,250,252,${resolvedTintOpacity})`,
          },
        ]}
      />
      {highlight ? (
        <View
          pointerEvents="none"
          style={[
            styles.highlight,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.85)' },
          ]}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
  },
  shadowLight: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
});
