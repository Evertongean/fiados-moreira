import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

export interface SettingsListItemProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  value?: string;
  disabled?: boolean;
  onPress?: () => void;
}

export function SettingsListItem({
  icon: Icon,
  title,
  description,
  value,
  disabled = false,
  onPress,
}: SettingsListItemProps) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          borderBottomColor: tokens.colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: tokens.colors.secondary, borderRadius: tokens.radius.md },
        ]}
      >
        <Icon color={tokens.colors.primary} size={21} />
      </View>
      <View style={styles.copy}>
        <AppText variant="label" weight="semibold">
          {title}
        </AppText>
        {description ? (
          <AppText color="textMuted" variant="caption">
            {description}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText color="textSecondary" variant="caption">
          {value}
        </AppText>
      ) : null}
      {!disabled ? <ChevronRight color={tokens.colors.textMuted} size={19} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
});
