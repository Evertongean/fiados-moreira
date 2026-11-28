import { Bell, Search } from 'lucide-react-native';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { AppText, IconButton } from '@/components/ui';
import { useNotifications } from '@/features/notifications/NotificationProvider';
import { useTheme } from '@/hooks/useTheme';

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
  const { unreadCount } = useNotifications();
  const { tokens } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        {showBrand ? <BrandLogo size={36} /> : null}
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
          <View style={styles.notificationAction}>
            <IconButton
              accessibilityLabel={
                unreadCount ? `Abrir notificações, ${unreadCount} não lidas` : 'Abrir notificações'
              }
              icon={Bell}
              onPress={() => router.push('/notifications')}
              variant="ghost"
            />
            {unreadCount ? (
              <View style={[styles.badge, { backgroundColor: tokens.colors.destructive }]}>
                <AppText color="primaryForeground" variant="caption">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </AppText>
              </View>
            ) : null}
          </View>
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
  notificationAction: { position: 'relative' },
  badge: {
    position: 'absolute',
    right: -3,
    top: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
