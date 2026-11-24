import { fireEvent, screen } from '@testing-library/react-native';

import { AppearanceScreen } from '@/features/settings/AppearanceScreen';
import { renderWithTheme } from './render';

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  replace: jest.fn(),
};

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

describe('<AppearanceScreen />', () => {
  it('uses the shared theme provider action when the user changes the theme', async () => {
    const setPreference = jest.fn().mockResolvedValue(undefined);
    await renderWithTheme(<AppearanceScreen />, { theme: { setPreference } });

    fireEvent.press(screen.getByRole('radio', { name: 'Tema escuro' }));
    expect(setPreference).toHaveBeenCalledWith('dark');
  });
});
