import { fireEvent, screen } from '@testing-library/react-native';

import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { renderWithTheme } from './render';

describe('<CurrencyInput />', () => {
  it('displays BRL while exposing integer cents', async () => {
    const onChangeCents = jest.fn();
    await renderWithTheme(
      <CurrencyInput label="Valor" onChangeCents={onChangeCents} valueCents={123456} />,
    );

    const input = screen.getByLabelText('Valor');
    expect(input.props.value).toBe('R$ 1.234,56');
    fireEvent.changeText(input, 'R$ 12,34');
    expect(onChangeCents).toHaveBeenCalledWith(1234);
  });
});
