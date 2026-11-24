import { render, type RenderOptions } from '@testing-library/react-native';
import type { PropsWithChildren, ReactElement } from 'react';

import { ThemeContext, type ThemeContextValue } from '@/theme/ThemeProvider';
import { createThemeTokens } from '@/theme/tokens';

const defaultTheme: ThemeContextValue = {
  preference: 'light',
  resolvedTheme: 'light',
  tokens: createThemeTokens('light'),
  isReady: true,
  setPreference: jest.fn().mockResolvedValue(undefined),
};

export function renderWithTheme(
  element: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { theme?: Partial<ThemeContextValue> },
) {
  const value = { ...defaultTheme, ...options?.theme };

  function Wrapper({ children }: PropsWithChildren) {
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
  }

  return render(element, { ...options, wrapper: Wrapper });
}
