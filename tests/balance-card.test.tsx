import { screen } from '@testing-library/react-native';

import { BalanceCard } from '@/components/cards';
import { renderWithTheme } from './render';

describe('<BalanceCard />', () => {
  it('shows an explicit unavailable state instead of a fabricated financial value', async () => {
    await renderWithTheme(<BalanceCard title="Total a receber" valueCents={null} />);

    expect(screen.getByText('Indisponível')).toBeOnTheScreen();
    expect(screen.queryByText('R$ 0,00')).not.toBeOnTheScreen();
  });
});
