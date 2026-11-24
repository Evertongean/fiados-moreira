import { Palette, ShieldCheck } from 'lucide-react-native';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/hooks/useTheme';

export default function HomeScreen() {
  const router = useRouter();
  const { tokens } = useTheme();

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View
        style={[
          styles.glow,
          {
            backgroundColor: `${tokens.colors.accent}18`,
            borderColor: `${tokens.colors.accent}20`,
          },
        ]}
      />
      <View className="w-full items-center" style={styles.hero}>
        <BrandLogo size={64} variant="symbol" />
        <View style={styles.copy}>
          <AppText accessibilityRole="header" align="center" variant="display">
            Fiados Moreira
          </AppText>
          <AppText align="center" color="textSecondary" style={styles.slogan} variant="body">
            Seu trabalho. Seu dinheiro. Seu controle.
          </AppText>
        </View>
        <View
          style={[
            styles.promise,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.lg,
            },
            tokens.shadows.sm,
          ]}
        >
          <ShieldCheck color={tokens.colors.success} size={22} />
          <View style={styles.promiseCopy}>
            <AppText variant="label" weight="semibold">
              Controle simples e confiável
            </AppText>
            <AppText color="textMuted" variant="caption">
              Uma base visual preparada para organizar os fiados da oficina.
            </AppText>
          </View>
        </View>
        {__DEV__ ? (
          <Button
            fullWidth
            icon={Palette}
            label="Abrir galeria do Design System"
            onPress={() => router.push('/design-system' as Href)}
            variant="secondary"
          />
        ) : null}
      </View>
      <AppText align="center" color="textMuted" variant="caption">
        Fundação visual do aplicativo · sem dados financeiros reais
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingTop: 48,
    paddingBottom: 16,
  },
  glow: {
    position: 'absolute',
    top: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
  },
  hero: {
    maxWidth: 420,
    gap: 28,
  },
  copy: {
    alignItems: 'center',
    gap: 8,
  },
  slogan: {
    maxWidth: 320,
  },
  promise: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
  },
  promiseCopy: {
    flex: 1,
    gap: 2,
  },
});
