import { fireEvent, screen } from '@testing-library/react-native';

import NotFoundScreen from '@/app/+not-found';
import { PageHeader } from '@/components/navigation/PageHeader';
import { AppHeader } from '@/components/navigation/AppHeader';
import { DebtsScreen } from '@/features/debts/DebtsScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { renderWithTheme } from './render';

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockDebtRepository = { listOverview: jest.fn().mockResolvedValue([]) };
const mockGlobalSearchRepository = {
  listFilterOptions: jest.fn().mockResolvedValue({ customers: [], vehicles: [] }),
};

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
  useLocalSearchParams: () => ({}),
  useRouter: () => mockRouter,
}));

jest.mock('@/hooks/useDatabase', () => ({
  useDatabase: () => ({
    workspace: { id: 'workspace-test', timezone: 'America/Fortaleza' },
    repositories: {
      debts: mockDebtRepository,
      globalSearch: mockGlobalSearchRepository,
    },
  }),
}));

describe('navigation actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens appearance settings', async () => {
    await renderWithTheme(<SettingsScreen />);

    fireEvent.press(screen.getByRole('button', { name: /Aparência/ }));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/appearance');
  });

  it('opens the global search from the dashboard header action', async () => {
    await renderWithTheme(<AppHeader showBrand showSearch title="Fiados Moreira" />);

    expect(screen.getByRole('image', { name: 'Logotipo Fiados Moreira' })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Abrir pesquisa global' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/search');
  });

  it('opens the new debt screen from the debts section', async () => {
    await renderWithTheme(<DebtsScreen />);

    fireEvent.press(screen.getByText('Novo fiado'));
    expect(mockRouter.push).toHaveBeenCalledWith('/debts/new');
  });

  it('uses navigation history when returning from a secondary screen', async () => {
    await renderWithTheme(<PageHeader title="Tela secundária" />);

    fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('uses the configured fallback when a deep link has no history', async () => {
    mockRouter.canGoBack.mockReturnValueOnce(false);
    await renderWithTheme(<PageHeader fallbackRoute="/debts" title="Tela secundária" />);

    fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/debts');
  });

  it('returns to the dashboard from an unknown route', async () => {
    await renderWithTheme(<NotFoundScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });
});
