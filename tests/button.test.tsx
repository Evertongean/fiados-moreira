import { fireEvent, screen } from '@testing-library/react-native';

import { Button } from '@/components/ui/Button';
import { renderWithTheme } from './render';

describe('<Button />', () => {
  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Salvar" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('blocks duplicate interaction while loading', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Salvar" loading onPress={onPress} />);

    const button = screen.getByRole('button');
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true, disabled: true }),
    );
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
