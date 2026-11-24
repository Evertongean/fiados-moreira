import type { TextStyle, ViewStyle } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export interface SemanticColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  foreground: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  accent: string;
  border: string;
  input: string;
  success: string;
  warning: string;
  destructive: string;
  info: string;
  disabled: string;
  overlay: string;
}

export type SemanticColorName = keyof SemanticColors;
export type TypographyVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'caption'
  | 'button'
  | 'currency';
export type FontWeightName = 'regular' | 'medium' | 'semibold' | 'bold';

export interface ThemeTokens {
  colors: SemanticColors;
  spacing: typeof import('@/theme/spacing').spacing;
  radius: typeof import('@/theme/radius').radius;
  typography: Record<TypographyVariant, TextStyle>;
  shadows: Record<'none' | 'sm' | 'md' | 'lg', ViewStyle>;
}
