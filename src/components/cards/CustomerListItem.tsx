import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { AppText } from '@/components/ui/AppText';
import { DebtStatusBadge, type DebtStatus } from '@/components/cards/DebtStatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { formatBRLCents } from '@/utils/currency';

export interface CustomerListItemProps extends Omit<PressableProps, 'children' | 'style'> {
  name: string;
  detail?: string;
  pendingCents: number;
  status?: DebtStatus;
}

export function CustomerListItem({
  name,
  detail,
  pendingCents,
  status,
  disabled,
  ...props
}: CustomerListItemProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      accessibilityLabel={`${name}, saldo pendente ${formatBRLCents(pendingCents)}`}
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
          opacity: disabled ? 0.48 : pressed ? 0.75 : 1,
        },
      ]}
      {...props}
    >
      <Avatar name={name} />
      <View style={styles.main}>
        <AppText numberOfLines={1} variant="label" weight="semibold">
          {name}
        </AppText>
        {detail ? (
          <AppText color="textMuted" numberOfLines={1} variant="caption">
            {detail}
          </AppText>
        ) : null}
        {status ? <DebtStatusBadge status={status} /> : null}
      </View>
      <View style={styles.trailing}>
        <AppText variant="bodySmall" weight="semibold">
          {formatBRLCents(pendingCents)}
        </AppText>
        <ChevronRight color={tokens.colors.textMuted} size={18} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  main: { flex: 1, alignItems: 'flex-start', gap: 3 },
  trailing: { alignItems: 'flex-end', gap: 8 },
});
