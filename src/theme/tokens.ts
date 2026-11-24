import { darkColors, lightColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { createShadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { ResolvedTheme, ThemePreference, ThemeTokens } from '@/theme/types';

export function resolveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme | null | undefined,
): ResolvedTheme {
  if (preference !== 'system') {
    return preference;
  }

  return systemTheme === 'dark' ? 'dark' : 'light';
}

export function createThemeTokens(theme: ResolvedTheme): ThemeTokens {
  return {
    colors: theme === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    typography,
    shadows: createShadows(theme),
  };
}

export function hexToRgbChannels(hex: string): string {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `${red} ${green} ${blue}`;
}
