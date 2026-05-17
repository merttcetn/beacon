import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, fontFamily } from '@/theme';

const BEACON_LOGO = require('@/../assets/images/beacon_logo.png');

interface Props {
  step?: string;
  size?: number;
}

export function Wordmark({ step, size = 22 }: Props) {
  const brandSize = Math.round(size * 0.78);
  const gap = Math.round(size * 0.42);
  const logoHeight = brandSize;
  const logoWidth = Math.round(logoHeight * (838 / 1410));
  return (
    <View style={[styles.row, { gap }]}>
      <Image
        source={BEACON_LOGO}
        style={{ width: logoWidth, height: logoHeight }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text style={[styles.brand, { fontSize: brandSize }]}>Beacon</Text>
      {step ? <Text style={styles.step}>{step}</Text> : null}
    </View>
  );
}

interface BeaconMarkProps {
  size?: number;
  tone?: 'onLight' | 'onDark';
}

export function BeaconMark({ size = 22, tone = 'onLight' }: BeaconMarkProps) {
  const tower = tone === 'onDark' ? '#FFFFFF' : colors.accent.primary;
  const light = colors.accent.soft;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3.5 9.5 Q1.8 12 3.5 14.5"
        stroke={light}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
        opacity={0.45}
      />
      <Path
        d="M20.5 9.5 Q22.2 12 20.5 14.5"
        stroke={light}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
        opacity={0.45}
      />
      <Path
        d="M5.8 8 Q4.6 11 5.8 14"
        stroke={light}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
        opacity={0.75}
      />
      <Path
        d="M18.2 8 Q19.4 11 18.2 14"
        stroke={light}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
        opacity={0.75}
      />
      <Circle cx={12} cy={6.4} r={1.6} fill={light} />
      <Rect x={8.4} y={7.6} width={7.2} height={2.2} rx={0.6} fill={tower} />
      <Path d="M9.5 9.8 L14.5 9.8 L15.4 19.6 L8.6 19.6 Z" fill={tower} />
      <Rect x={7.4} y={19.6} width={9.2} height={1.6} rx={0.4} fill={tower} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  brand: {
    fontFamily: fontFamily.displayExtra,
    color: colors.text.primary,
    letterSpacing: -0.15,
  },
  step: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    marginLeft: 'auto',
  },
});
