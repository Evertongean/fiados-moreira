import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/hooks/useTheme';
import { formatBRLCents } from '@/utils/currency';

export interface BalanceCardProps extends ViewProps {
  title: string;
  valueCents: number;
  description?: string;
  icon?: LucideIcon;
  hidden?: boolean;
  onToggleHidden?: () => void;
}

export function BalanceCard({
  title,
  valueCents,
  description,
  icon: Icon,
  hidden = false,
  onToggleHidden,
  style,
  ...props
}: BalanceCardProps) {
  const { tokens } = useTheme();

  return (
    <Card style={[styles.card, style]} variant="highlighted" {...props}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {Icon ? <Icon color={tokens.colors.primary} size={20} /> : null}
          <AppText color="textSecondary" variant="label">
            {title}
          </AppText>
        </View>
        {onToggleHidden ? (
          <IconButton
            accessibilityLabel={hidden ? 'Mostrar valor' : 'Ocultar valor'}
            icon={hidden ? EyeOff : Eye}
            onPress={onToggleHidden}
            size="sm"
            variant="ghost"
          />
        ) : null}
      </View>
      <AppText variant="currency">{hidden ? 'R$ ••••••' : formatBRLCents(valueCents)}</AppText>
      {description ? (
        <AppText color="textSecondary" variant="bodySmall">
          {description}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 150 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
