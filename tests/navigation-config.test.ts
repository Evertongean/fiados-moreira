import { MAIN_TABS } from '@/components/navigation/navigationConfig';

describe('main navigation', () => {
  it('defines exactly the five product sections in the expected order', () => {
    expect(MAIN_TABS.map(({ name, title }) => ({ name, title }))).toEqual([
      { name: 'index', title: 'Início' },
      { name: 'customers', title: 'Clientes' },
      { name: 'debts', title: 'Fiados' },
      { name: 'reports', title: 'Relatórios' },
      { name: 'settings', title: 'Ajustes' },
    ]);
  });

  it('provides accessible labels and icons for every tab', () => {
    for (const tab of MAIN_TABS) {
      expect(tab.accessibilityLabel).toMatch(/^Aba /);
      expect(tab.icon).toBeDefined();
    }
  });
});
