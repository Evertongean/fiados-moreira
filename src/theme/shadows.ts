import type { ViewStyle } from 'react-native';

import type { ResolvedTheme } from '@/theme/types';

export function createShadows(
  theme: ResolvedTheme,
): Record<'none' | 'sm' | 'md' | 'lg', ViewStyle> {
  const opacityMultiplier = theme === 'dark' ? 0.65 : 1;

  return {
    none: {},
    sm: {
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08 * opacityMultiplier,
      shadowRadius: 3,
    },
    md: {
      elevation: 4,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12 * opacityMultiplier,
      shadowRadius: 8,
    },
    lg: {
      elevation: 8,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16 * opacityMultiplier,
      shadowRadius: 18,
    },
  };
}
