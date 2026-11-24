import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ThemePreference } from '@/theme/types';

export const THEME_PREFERENCE_STORAGE_KEY = '@fiados-moreira/theme-preference';

const themePreferences: readonly ThemePreference[] = ['light', 'dark', 'system'];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && themePreferences.includes(value as ThemePreference);
}

export async function loadThemePreference(): Promise<ThemePreference> {
  const storedPreference = await AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);
  return isThemePreference(storedPreference) ? storedPreference : 'system';
}

export async function saveThemePreference(preference: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
}
