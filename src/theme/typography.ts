import type { TextStyle } from 'react-native';

import type { FontWeightName, TypographyVariant } from '@/theme/types';

export const fontFamilies: Record<FontWeightName, string> = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const typography: Record<TypographyVariant, TextStyle> = {
  display: { fontSize: 40, lineHeight: 48, letterSpacing: -1.2 },
  h1: { fontSize: 32, lineHeight: 40, letterSpacing: -0.8 },
  h2: { fontSize: 28, lineHeight: 36, letterSpacing: -0.5 },
  h3: { fontSize: 24, lineHeight: 32, letterSpacing: -0.3 },
  h4: { fontSize: 20, lineHeight: 28 },
  body: { fontSize: 16, lineHeight: 24 },
  bodySmall: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  button: { fontSize: 15, lineHeight: 20, letterSpacing: 0.1 },
  currency: {
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
};
