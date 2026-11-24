import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/hooks/useTheme';

export interface CheckboxProps extends Omit<PressableProps, 'children' | 'onPress'> {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: string;
}

export function Checkbox({
  label,
  checked,
  onCheckedChange,
  description,
  disabled,
  ...props
}: CheckboxProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      style={({ pressed }) => [styles.container, { opacity: disabled ? 0.45 : pressed ? 0.72 : 1 }]}
      {...props}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? tokens.colors.primary : tokens.colors.surface,
            borderColor: checked ? tokens.colors.primary : tokens.colors.input,
            borderRadius: tokens.radius.xs,
          },
        ]}
      >
        {checked ? (
          <Check color={tokens.colors.primaryForeground} size={16} strokeWidth={3} />
        ) : null}
      </View>
      <View style={styles.copy}>
        <AppText variant="label">{label}</AppText>
        {description ? (
          <AppText color="textMuted" variant="caption">
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  copy: { flex: 1, gap: 1 },
});
