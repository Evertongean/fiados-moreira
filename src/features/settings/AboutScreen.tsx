import Constants from 'expo-constants';
import { Palette } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { PageHeader } from '@/components/navigation';
import { AppText, Button, Card, Screen } from '@/components/ui';

export function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? 'Não informada';

  return (
    <Screen contentContainerStyle={styles.page} scroll>
      <PageHeader fallbackRoute="/settings" title="Sobre" />
      <View style={styles.brand}>
        <BrandLogo showSlogan size={58} />
      </View>
      <Card variant="outlined">
        <View style={styles.copy}>
          <AppText variant="h4">Controle de fiados para oficina mecânica</AppText>
          <AppText color="textSecondary" variant="bodySmall">
            Organize clientes, veículos, dívidas e pagamentos com uma experiência mobile simples e
            preparada para funcionar offline.
          </AppText>
          <AppText color="textMuted" variant="caption">
            Versão {version}
          </AppText>
        </View>
      </Card>
      {__DEV__ ? (
        <Button
          icon={Palette}
          label="Abrir galeria do Design System"
          onPress={() => router.push('/dev/design-system')}
          variant="outline"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 24, paddingBottom: 40 },
  brand: { alignItems: 'center', paddingVertical: 20 },
  copy: { gap: 10 },
});
