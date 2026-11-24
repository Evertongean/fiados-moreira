import { screen } from '@testing-library/react-native';

import TabsLayout from '@/app/(tabs)/_layout';
import { renderWithTheme } from './render';

jest.mock('expo-router', () => {
  const mockReact = require('react');
  const Tabs = ({ children }: { children: React.ReactNode }) =>
    mockReact.createElement('View', { testID: 'tabs' }, children);
  Tabs.Screen = ({ name, options }: { name: string; options: { title: string } }) =>
    mockReact.createElement('View', {
      accessibilityLabel: options.title,
      testID: `tab-screen-${name}`,
    });
  return { Tabs };
});

describe('<TabsLayout />', () => {
  it('renders exactly the five main tabs', async () => {
    await renderWithTheme(<TabsLayout />);

    expect(screen.getAllByTestId(/^tab-screen-/)).toHaveLength(5);
    for (const name of ['Início', 'Clientes', 'Fiados', 'Relatórios', 'Ajustes']) {
      expect(screen.getByLabelText(name)).toBeOnTheScreen();
    }
  });
});
