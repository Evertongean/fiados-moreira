import { fireEvent, screen } from '@testing-library/react-native';

import { RadioGroup } from '@/components/ui/RadioGroup';
import type { ThemePreference } from '@/theme/types';
import { renderWithTheme } from './render';

describe('<RadioGroup />', () => {
  it('announces selection and changes the selected value', async () => {
    const onValueChange = jest.fn();
    await renderWithTheme(
      <RadioGroup<ThemePreference>
        onValueChange={onValueChange}
        options={[
          { label: 'Claro', value: 'light' },
          { label: 'Escuro', value: 'dark' },
        ]}
        value="light"
      />,
    );

    expect(screen.getByRole('radio', { name: 'Claro' }).props.accessibilityState.selected).toBe(
      true,
    );
    fireEvent.press(screen.getByRole('radio', { name: 'Escuro' }));
    expect(onValueChange).toHaveBeenCalledWith('dark');
  });
});
