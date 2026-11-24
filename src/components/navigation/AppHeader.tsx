import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { AppText, IconButton } from '@/components/ui';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBrand?: boolean;
  showNotifications?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  showBrand = false,
  showNotifications = true,
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
      {showNotifications ? (
        <IconButton
          accessibilityLabel="Abrir notificações"
          icon={Bell}
          onPress={() => router.push('/notifications')}
          variant="ghost"
        />
      ) : null}
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
});
