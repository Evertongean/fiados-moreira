import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

export type CardVariant = 'default' | 'outlined' | 'elevated' | 'highlighted';

export interface CardProps extends PropsWithChildren<Omit<ViewProps, 'children'>> {
  variant?: CardVariant;
  header?: ReactNode;
  footer?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({
  variant = 'default',
  header,
  children,
  footer,
  onPress,
  accessibilityLabel,
  style,
  ...props
}: CardProps) {
  const { tokens } = useTheme();
  const isInteractive = Boolean(onPress);
  const variantStyle = {
    backgroundColor: variant === 'highlighted' ? tokens.colors.secondary : tokens.colors.surface,
    borderColor: variant === 'highlighted' ? tokens.colors.accent : tokens.colors.border,
    borderWidth: variant === 'outlined' || variant === 'highlighted' ? 1 : 0,
  };
  const content = (
    <>
      {header ? <View style={styles.section}>{header}</View> : null}
      <View style={styles.content}>{children}</View>
      {footer ? <View style={styles.section}>{footer}</View> : null}
    </>
  );
  const sharedStyle = [
    styles.card,
    variantStyle,
    { borderRadius: tokens.radius.lg },
    variant === 'elevated' ? tokens.shadows.md : tokens.shadows.none,
    style,
  ];

  if (isInteractive) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [sharedStyle, { opacity: pressed ? 0.82 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={sharedStyle} {...props}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  content: { padding: 16 },
  section: { paddingHorizontal: 16, paddingVertical: 12 },
});
