import { CheckCircle2, CircleAlert, CircleX, Info } from 'lucide-react-native';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/hooks/useTheme';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

export interface BadgeProps extends ViewProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'default', style, ...props }: BadgeProps) {
  const { tokens } = useTheme();
  const color = getBadgeColor(variant, tokens.colors);
  const outlined = variant === 'outline';

  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.badge,
        {
          backgroundColor: outlined ? 'transparent' : `${color}18`,
          borderColor: outlined ? tokens.colors.border : `${color}35`,
          borderRadius: tokens.radius.full,
        },
        style,
      ]}
      {...props}
    >
      {renderBadgeIcon(variant, color)}
      <AppText style={{ color }} variant="caption" weight="semibold">
        {label}
      </AppText>
    </View>
  );
}

function getBadgeColor(
  variant: BadgeVariant,
  colors: ReturnType<typeof useTheme>['tokens']['colors'],
) {
  switch (variant) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'destructive':
      return colors.destructive;
    case 'info':
      return colors.info;
    case 'outline':
      return colors.textSecondary;
    default:
      return colors.primary;
  }
}

function renderBadgeIcon(variant: BadgeVariant, color: string) {
  const iconProps = { color, size: 14, strokeWidth: 2.4 };

  switch (variant) {
    case 'success':
      return <CheckCircle2 {...iconProps} />;
    case 'warning':
      return <CircleAlert {...iconProps} />;
    case 'destructive':
      return <CircleX {...iconProps} />;
    case 'info':
      return <Info {...iconProps} />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
});
