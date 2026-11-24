import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

export interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  accessibilityLabel: string;
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'destructive';
}

const buttonSizes = { sm: 40, md: 48, lg: 56 } as const;
const iconSizes = { sm: 18, md: 21, lg: 24 } as const;

export function IconButton({
  accessibilityLabel,
  icon: Icon,
  size = 'md',
  variant = 'default',
  disabled,
  ...props
}: IconButtonProps) {
  const { tokens } = useTheme();
  const foreground =
    variant === 'destructive' ? tokens.colors.destructive : tokens.colors.foreground;
  const background = variant === 'ghost' ? 'transparent' : tokens.colors.surfaceSecondary;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        {
          width: buttonSizes[size],
          height: buttonSizes[size],
          borderRadius: tokens.radius.full,
          backgroundColor: background,
          opacity: disabled ? 0.45 : pressed ? 0.68 : 1,
        },
      ]}
      {...props}
    >
      <Icon color={foreground} size={iconSizes[size]} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
