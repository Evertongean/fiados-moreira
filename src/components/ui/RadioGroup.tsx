import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/hooks/useTheme';

export interface RadioOption<T extends string> {
  label: string;
  value: T;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string> extends Omit<ViewProps, 'children'> {
  label?: string;
  options: readonly RadioOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
}

export function RadioGroup<T extends string>({
  label,
  options,
  value,
  onValueChange,
  style,
  ...props
}: RadioGroupProps<T>) {
  const { tokens } = useTheme();

  return (
    <View accessibilityRole="radiogroup" style={[styles.group, style]} {...props}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: option.disabled }}
            disabled={option.disabled}
            key={option.value}
            onPress={() => onValueChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              {
                borderColor: selected ? tokens.colors.primary : tokens.colors.border,
                backgroundColor: selected ? tokens.colors.secondary : tokens.colors.surface,
                borderRadius: tokens.radius.md,
                opacity: option.disabled ? 0.45 : pressed ? 0.75 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.radio,
                { borderColor: selected ? tokens.colors.primary : tokens.colors.input },
              ]}
            >
              {selected ? (
                <View style={[styles.dot, { backgroundColor: tokens.colors.primary }]} />
              ) : null}
            </View>
            <View style={styles.copy}>
              <AppText variant="label">{option.label}</AppText>
              {option.description ? (
                <AppText color="textMuted" variant="caption">
                  {option.description}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { width: '100%', gap: 10 },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  radio: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 2,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  copy: { flex: 1, gap: 1 },
});
