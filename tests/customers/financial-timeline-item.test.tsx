import { screen, userEvent } from '@testing-library/react-native';

import { FinancialTimelineItem } from '@/features/customers/components/FinancialTimelineItem';
import type { FinancialHistoryEvent } from '@/features/customers/domain/customerTypes';

import { renderWithTheme } from '../render';

const event: FinancialHistoryEvent = {
  id: 'audit:event-1',
  type: 'debt_updated',
  occurredAt: '2026-11-26T12:00:00.000Z',
  debtId: '01JDEBT123456789',
  paymentId: null,
  debtDescription: 'Revisão completa',
  amountCents: 60_000,
  previousAmountCents: 50_000,
  note: null,
  vehicleId: 'vehicle-1',
  vehicleBrand: 'Fiat',
  vehicleModel: 'Uno',
  vehiclePlate: 'ABC1234',
  status: 'updated',
};

describe('FinancialTimelineItem', () => {
  it('presents the recorded movement accessibly and opens its details', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await renderWithTheme(
      <FinancialTimelineItem event={event} onPress={onPress} timezone="America/Fortaleza" />,
    );

    expect(screen.getByText('Alteração do fiado')).toBeOnTheScreen();
    expect(screen.getByText('R$ 500,00 → R$ 600,00')).toBeOnTheScreen();
    expect(screen.getByText('Fiat Uno · ABC-1234')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Abrir detalhes de alteração do fiado' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
