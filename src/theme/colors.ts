import type { SemanticColors } from '@/theme/types';

export const brandColors = {
  dark: '#10271F',
  primary: '#184D37',
  accent: '#22C55E',
  white: '#FFFFFF',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
} as const;

export const lightColors: SemanticColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  foreground: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  primary: '#184D37',
  primaryForeground: '#FFFFFF',
  secondary: '#E7F1EB',
  accent: '#22C55E',
  border: '#E2E8F0',
  input: '#CBD5E1',
  success: '#15803D',
  warning: '#92400E',
  destructive: '#B91C1C',
  info: '#1D4ED8',
  disabled: '#94A3B8',
  overlay: '#0F172A',
};

export const darkColors: SemanticColors = {
  background: '#101714',
  surface: '#18231D',
  surfaceSecondary: '#223129',
  foreground: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  primary: '#22C55E',
  primaryForeground: '#071C12',
  secondary: '#263C31',
  accent: '#4ADE80',
  border: '#304138',
  input: '#40584B',
  success: '#4ADE80',
  warning: '#FBBF24',
  destructive: '#F87171',
  info: '#60A5FA',
  disabled: '#64748B',
  overlay: '#020806',
};
