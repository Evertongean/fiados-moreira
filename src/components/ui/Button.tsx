import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/hooks/useTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

const heights: Record<ButtonSize, number> = { sm: 40, md: 48, lg: 56, icon: 48 };

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const { tokens } = useTheme();
  const isDisabled = Boolean(disabled || loading);
  const palette = getButtonPalette(variant, tokens.colors);
  const iconSize = size === 'sm' ? 17 : 20;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(event) => {
        if (variant === 'primary' || variant === 'destructive') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: heights[size],
          paddingHorizontal: size === 'sm' ? 14 : size === 'icon' ? 12 : 20,
          borderRadius: tokens.radius.md,
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: isDisabled ? 0.52 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        variant === 'link' && styles.link,
        fullWidth && styles.fullWidth,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} size="small" />
      ) : (
        <View style={styles.content}>
          {Icon && iconPosition === 'left' ? (
            <Icon color={palette.foreground} size={iconSize} strokeWidth={2.2} />
          ) : null}
          <AppText
            color="foreground"
            style={{
              color: palette.foreground,
              textDecorationLine: variant === 'link' ? 'underline' : 'none',
            }}
            variant="button"
          >
            {label}
          </AppText>
          {Icon && iconPosition === 'right' ? (
            <Icon color={palette.foreground} size={iconSize} strokeWidth={2.2} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

function getButtonPalette(
  variant: ButtonVariant,
  colors: ReturnType<typeof useTheme>['tokens']['colors'],
) {
  switch (variant) {
    case 'secondary':
      return { background: colors.secondary, foreground: colors.primary, border: 'transparent' };
    case 'outline':
      return { background: 'transparent', foreground: colors.foreground, border: colors.border };
    case 'ghost':
      return { background: 'transparent', foreground: colors.primary, border: 'transparent' };
    case 'destructive':
      return {
        background: colors.destructive,
        foreground: colors.surface,
        border: colors.destructive,
      };
    case 'link':
      return { background: 'transparent', foreground: colors.primary, border: 'transparent' };
    case 'primary':
    default:
      return {
        background: colors.primary,
        foreground: colors.primaryForeground,
        border: colors.primary,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullWidth: { width: '100%' },
  link: { minHeight: 40, paddingHorizontal: 8 },
});
