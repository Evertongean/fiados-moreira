import type { LucideIcon } from 'lucide-react-native';
import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

export interface FloatingActionButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
  icon?: LucideIcon;
}

export function FloatingActionButton({
  accessibilityLabel,
  onPress,
  icon: Icon = Plus,
}: FloatingActionButtonProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: tokens.colors.primary,
          borderRadius: tokens.radius.full,
          opacity: pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        tokens.shadows.md,
      ]}
    >
      <Icon color={tokens.colors.primaryForeground} size={26} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
