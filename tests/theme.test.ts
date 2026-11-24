import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadThemePreference,
  saveThemePreference,
  THEME_PREFERENCE_STORAGE_KEY,
} from '@/theme/storage';
import { createThemeTokens, resolveTheme } from '@/theme/tokens';

describe('theme resolution', () => {
  it('respects explicit preferences', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });

  it('follows the device theme and safely defaults to light', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', null)).toBe('light');
  });

  it('returns complete theme-specific semantic tokens', () => {
    expect(createThemeTokens('light').colors.background).toBe('#F8FAFC');
    expect(createThemeTokens('dark').colors.background).toBe('#101714');
  });
});

describe('theme persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists only the visual preference', async () => {
    await saveThemePreference('dark');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_PREFERENCE_STORAGE_KEY, 'dark');
  });

  it('restores a valid preference', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('system');
    await expect(loadThemePreference()).resolves.toBe('system');
  });

  it('ignores corrupt persisted values', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('invalid');
    await expect(loadThemePreference()).resolves.toBe('system');
  });
});
