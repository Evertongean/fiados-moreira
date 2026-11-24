import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import type { SemanticColorName } from '@/theme/types';

export type StatCardVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info';

export interface StatCardProps extends ViewProps {
  label: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  variant?: StatCardVariant;
}

const variantColors: Record<StatCardVariant, SemanticColorName> = {
  default: 'primary',
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
  info: 'info',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  variant = 'default',
  style,
  ...props
}: StatCardProps) {
  const { tokens } = useTheme();
  const color = tokens.colors[variantColors[variant]];

  return (
    <Card style={[styles.card, style]} variant="outlined" {...props}>
      <View
        style={[styles.icon, { backgroundColor: `${color}18`, borderRadius: tokens.radius.md }]}
      >
        <Icon color={color} size={22} />
      </View>
      <AppText color="textSecondary" variant="caption">
        {label}
      </AppText>
      <AppText variant="h4">{value}</AppText>
      {description ? (
        <AppText color="textMuted" variant="caption">
          {description}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { minWidth: 148 },
  icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
});
