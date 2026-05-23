import { TextStyle } from 'react-native';

export const typography = {
  displayXl: { fontSize: 32, lineHeight: 40, fontWeight: '700' } satisfies TextStyle,
  displayLg: { fontSize: 28, lineHeight: 36, fontWeight: '700' } satisfies TextStyle,
  displayMd: { fontSize: 24, lineHeight: 32, fontWeight: '600' } satisfies TextStyle,

  headingLg: { fontSize: 20, lineHeight: 28, fontWeight: '600' } satisfies TextStyle,
  headingMd: { fontSize: 18, lineHeight: 24, fontWeight: '600' } satisfies TextStyle,
  headingSm: { fontSize: 16, lineHeight: 22, fontWeight: '600' } satisfies TextStyle,

  bodyLg: { fontSize: 17, lineHeight: 26, fontWeight: '400' } satisfies TextStyle,
  bodyMd: { fontSize: 15, lineHeight: 22, fontWeight: '400' } satisfies TextStyle,
  bodySm: { fontSize: 13, lineHeight: 18, fontWeight: '400' } satisfies TextStyle,

  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' } satisfies TextStyle,
} as const;

// Manrope = display (başlık), Inter = body, JetBrains Mono = mono (etiket / koordinat)
export const fontFamily = {
  display: 'Manrope_700Bold',
  displayExtra: 'Manrope_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_600SemiBold',
} as const;

export type TypographyKey = keyof typeof typography;
