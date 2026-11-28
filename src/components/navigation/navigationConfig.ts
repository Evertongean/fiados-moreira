import { ChartColumn, House, Settings, Wallet, type LucideIcon } from 'lucide-react-native';

export interface MainTabConfig {
  name: 'index' | 'debts' | 'reports' | 'settings';
  title: string;
  accessibilityLabel: string;
  icon: LucideIcon;
}

export const MAIN_TABS: readonly MainTabConfig[] = [
  { name: 'index', title: 'Início', accessibilityLabel: 'Aba Início', icon: House },
  { name: 'debts', title: 'Fiados', accessibilityLabel: 'Aba Fiados', icon: Wallet },
  {
    name: 'reports',
    title: 'Relatórios',
    accessibilityLabel: 'Aba Relatórios',
    icon: ChartColumn,
  },
  { name: 'settings', title: 'Ajustes', accessibilityLabel: 'Aba Ajustes', icon: Settings },
] as const;
