import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { DashboardScreen } from '@/features/dashboard/DashboardScreen';

import { renderWithTheme } from '../render';

const mockPush = jest.fn();
const mockGetSnapshot = jest.fn().mockResolvedValue({
  summary: {
    receivableCents: 125_000,
    overdueCents: 35_000,
    dueTodayCents: 15_000,
    debtorCustomerCount: 3,
    openDebtCount: 4,
    overdueDebtCount: 2,
    monthGrossReceivedCents: 80_000,
    monthReversedCents: 5_000,
    monthNetReceivedCents: 75_000,
  },
  dailyReceipts: [],
  upcomingDebts: [],
  priorityOverdueDebts: [],
  recentActivities: [],
  currentCivilDate: '2026-11-27',
});

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/useDatabase', () => ({
  useDatabase: () => ({
    workspace: { id: 'workspace-dashboard', timezone: 'America/Fortaleza' },
    repositories: { dashboard: { getSnapshot: mockGetSnapshot } },
  }),
}));

describe('dashboard screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the compact Home without the logo, chart or recent activities', async () => {
    const { unmount } = await renderWithTheme(<DashboardScreen />);

    expect(await screen.findByText('Resumo financeiro')).toBeOnTheScreen();
    expect(screen.getByText('Fiados Moreira')).toBeOnTheScreen();
    expect(screen.getByText('Bem-vindo ao controle da sua oficina')).toBeOnTheScreen();
    expect(screen.queryByRole('image', { name: 'Logotipo Fiados Moreira' })).toBeNull();
    expect(screen.getByText('Total a receber')).toBeOnTheScreen();
    expect(screen.getByText('Total em atraso')).toBeOnTheScreen();
    expect(screen.queryByText('Últimos sete dias')).toBeNull();
    expect(screen.queryByText('Atividades financeiras recentes')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Abrir pesquisa global' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Abrir notificações' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Novo cliente' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Novo fiado' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Registrar pagamento' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Abrir fiados atrasados' })).toHaveStyle({
      minHeight: 104,
      backgroundColor: '#B91C1C12',
      borderColor: '#B91C1C40',
    });
    unmount();
  });

  it('keeps value privacy and quick-action navigation working', async () => {
    const { unmount } = await renderWithTheme(<DashboardScreen />);
    await screen.findByText('Resumo financeiro');

    fireEvent.press(screen.getByRole('button', { name: 'Ocultar valor' }));
    await waitFor(() => expect(screen.getAllByText('R$ ••••••')).toHaveLength(2));

    fireEvent.press(screen.getByText('Novo fiado'));
    fireEvent.press(screen.getByText('Registrar pagamento'));

    expect(mockPush).toHaveBeenNthCalledWith(1, '/debts/new');
    expect(mockPush).toHaveBeenNthCalledWith(2, {
      pathname: '/debts',
      params: { filter: 'open', mode: 'payment' },
    });
    unmount();
  });
});
