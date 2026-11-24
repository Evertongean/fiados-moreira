import { Moon, Smartphone, Sun } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/navigation';
import { Alert, AppText, Card, RadioGroup, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { ThemePreference } from '@/theme/types';

const options = [
  { label: 'Tema claro', value: 'light', description: 'Interface clara e alto contraste.' },
  { label: 'Tema escuro', value: 'dark', description: 'Conforto em ambientes com pouca luz.' },
  {
    label: 'Seguir o sistema',
    value: 'system',
    description: 'Acompanha a preferência do dispositivo.',
  },
] as const;

export function AppearanceScreen() {
  const { preference, setPreference, resolvedTheme, tokens } = useTheme();

  return (
    <Screen contentContainerStyle={styles.page} scroll>
      <PageHeader
        fallbackRoute="/settings"
        subtitle="A escolha é salva neste dispositivo."
        title="Aparência"
      />
      <Card variant="outlined">
        <RadioGroup<ThemePreference>
          label="Tema do aplicativo"
          onValueChange={(value) => void setPreference(value)}
          options={options}
          value={preference}
        />
      </Card>
      <View style={styles.preview}>
        <Sun color={tokens.colors.warning} size={24} />
        <Smartphone color={tokens.colors.primary} size={28} />
        <Moon color={tokens.colors.info} size={24} />
      </View>
      <Alert
        description={`O aplicativo está usando o tema ${resolvedTheme === 'dark' ? 'escuro' : 'claro'} neste momento.`}
        title="Tema aplicado"
        variant="success"
      />
      <AppText color="textMuted" variant="caption">
        A preferência é aplicada também às abas, cabeçalhos, StatusBar e telas secundárias.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 40 },
  preview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
});
