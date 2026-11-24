import * as SystemUI from 'expo-system-ui';
import { vars } from 'nativewind';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Appearance, StyleSheet, useColorScheme, View } from 'react-native';

import { loadThemePreference, saveThemePreference } from '@/theme/storage';
import { createThemeTokens, hexToRgbChannels, resolveTheme } from '@/theme/tokens';
import type { ResolvedTheme, ThemePreference, ThemeTokens } from '@/theme/types';

export interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  tokens: ThemeTokens;
  isReady: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function createNativeWindVariables(tokens: ThemeTokens) {
  return vars({
    '--color-background': hexToRgbChannels(tokens.colors.background),
    '--color-surface': hexToRgbChannels(tokens.colors.surface),
    '--color-surface-secondary': hexToRgbChannels(tokens.colors.surfaceSecondary),
    '--color-foreground': hexToRgbChannels(tokens.colors.foreground),
    '--color-text-secondary': hexToRgbChannels(tokens.colors.textSecondary),
    '--color-text-muted': hexToRgbChannels(tokens.colors.textMuted),
    '--color-primary': hexToRgbChannels(tokens.colors.primary),
    '--color-primary-foreground': hexToRgbChannels(tokens.colors.primaryForeground),
    '--color-secondary': hexToRgbChannels(tokens.colors.secondary),
    '--color-accent': hexToRgbChannels(tokens.colors.accent),
    '--color-border': hexToRgbChannels(tokens.colors.border),
    '--color-input': hexToRgbChannels(tokens.colors.input),
    '--color-success': hexToRgbChannels(tokens.colors.success),
    '--color-warning': hexToRgbChannels(tokens.colors.warning),
    '--color-destructive': hexToRgbChannels(tokens.colors.destructive),
    '--color-info': hexToRgbChannels(tokens.colors.info),
    '--color-disabled': hexToRgbChannels(tokens.colors.disabled),
  });
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);
  const resolvedTheme = resolveTheme(preference, systemTheme);
  const tokens = useMemo(() => createThemeTokens(resolvedTheme), [resolvedTheme]);
  const nativeWindVariables = useMemo(() => createNativeWindVariables(tokens), [tokens]);

  useEffect(() => {
    let isMounted = true;

    loadThemePreference()
      .then((storedPreference) => {
        if (isMounted) {
          setPreferenceState(storedPreference);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(tokens.colors.background).catch(() => undefined);
  }, [tokens.colors.background]);

  const setPreference = useCallback(async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    await saveThemePreference(nextPreference);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, tokens, isReady, setPreference }),
    [isReady, preference, resolvedTheme, setPreference, tokens],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[styles.root, nativeWindVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
