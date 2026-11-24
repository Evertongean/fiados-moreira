import { screen } from '@testing-library/react-native';

import { CustomerDetailsScreen } from '@/features/customers/CustomerDetailsScreen';
import { renderWithTheme } from './render';

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '../unsafe' }),
  useRouter: () => mockRouter,
}));

describe('dynamic route fallback', () => {
  it('renders a safe state for an invalid customer identifier', async () => {
    await renderWithTheme(<CustomerDetailsScreen />);

    expect(screen.getByText('Cliente inválido')).toBeOnTheScreen();
    expect(screen.getByText(/formato inválido/)).toBeOnTheScreen();
  });
});
