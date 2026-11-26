import { Bell, Search } from 'lucide-react-native';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { AppText, IconButton } from '@/components/ui';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBrand?: boolean;
  showNotifications?: boolean;
  showSearch?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  showBrand = false,
  showNotifications = true,
  showSearch = false,
}: AppHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        {showBrand ? <BrandLogo size={36} variant="symbol" /> : null}
        <View style={styles.titleGroup}>
          <AppText accessibilityRole="header" variant="h3">
            {title}
          </AppText>
          {subtitle ? (
            <AppText color="textSecondary" variant="bodySmall">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        {showSearch ? (
          <IconButton
            accessibilityLabel="Abrir pesquisa global"
            icon={Search}
            onPress={() => router.push('/search' as Href)}
            variant="ghost"
          />
        ) : null}
        {showNotifications ? (
          <IconButton
            accessibilityLabel="Abrir notificações"
            icon={Bell}
            onPress={() => router.push('/notifications')}
            variant="ghost"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleGroup: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
