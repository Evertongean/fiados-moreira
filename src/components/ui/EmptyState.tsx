import type { LucideIcon } from 'lucide-react-native';
import { Inbox } from 'lucide-react-native';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';

export interface EmptyStateProps extends ViewProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: Pick<ButtonProps, 'label' | 'onPress' | 'icon'>;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  style,
  ...props
}: EmptyStateProps) {
  const { tokens } = useTheme();

  return (
    <View style={[styles.container, style]} {...props}>
      <View
        style={[
          styles.icon,
          { backgroundColor: tokens.colors.secondary, borderRadius: tokens.radius.full },
        ]}
      >
        <Icon color={tokens.colors.primary} size={30} strokeWidth={1.8} />
      </View>
      <View style={styles.copy}>
        <AppText align="center" variant="h4">
          {title}
        </AppText>
        <AppText align="center" color="textSecondary" variant="bodySmall">
          {description}
        </AppText>
      </View>
      {action ? <Button {...action} variant="primary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  icon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  copy: { maxWidth: 320, alignItems: 'center', gap: 6 },
});
