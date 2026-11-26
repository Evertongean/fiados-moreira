import { fireEvent, screen } from '@testing-library/react-native';

import { DashboardActivityItem } from '@/features/dashboard/components/DashboardActivityItem';
import { DashboardDebtItem } from '@/features/dashboard/components/DashboardDebtItem';
import { ReceiptsChart } from '@/features/dashboard/components/ReceiptsChart';

import { renderWithTheme } from '../render';

describe('dashboard components', () => {
  it('presents an accessible debt shortcut and respects hidden values', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <DashboardDebtItem
        debt={{
          id: 'debt-1',
          customerName: 'Cliente Dashboard',
          description: 'Troca de correia',
          dueDate: '2026-11-25',
          pendingCents: 12_500,
        }}
        hidden
        onPress={onPress}
        overdue
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Abrir fiado de Cliente Dashboard' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('R$ ••••••')).toBeTruthy();
    expect(screen.getByText('Venceu em 25/11/2026')).toBeTruthy();
  });

  it('routes a recent activity without fabricating a missing amount', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <DashboardActivityItem
        activity={{
          id: 'activity-1',
          type: 'debt_canceled',
          occurredAt: '2026-11-26T12:00:00.000Z',
          debtId: 'debt-1',
          paymentId: null,
          customerName: 'Cliente Dashboard',
          debtDescription: 'Serviço cancelado',
          amountCents: null,
          isReversed: false,
        }}
        onPress={onPress}
        timezone="America/Fortaleza"
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Abrir detalhes de fiado cancelado' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/^R\$/)).toBeNull();
  });

  it('describes gross receipts, reversals and net values without exposing hidden amounts', async () => {
    const data = [
      {
        civilDate: '2026-11-26',
        grossCents: 10_000,
        reversedCents: 2_000,
        netCents: 8_000,
      },
    ];
    const { unmount } = await renderWithTheme(<ReceiptsChart data={data} />);
    expect(
      screen.getByLabelText(/bruto R\$ 100,00, estornos R\$ 20,00, líquido R\$ 80,00/),
    ).toBeTruthy();
    unmount();

    await renderWithTheme(<ReceiptsChart data={data} hidden />);
    expect(
      screen.getByLabelText('Recebimentos dos últimos sete dias. Valores ocultos.'),
    ).toBeTruthy();
    expect(screen.queryByLabelText(/bruto R\$/)).toBeNull();
  });
});
