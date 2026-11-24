import { CheckCircle2, CircleAlert, CircleX, Info } from 'lucide-react-native';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/hooks/useTheme';

export type AlertVariant = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps extends ViewProps {
  title: string;
  description?: string;
  variant?: AlertVariant;
}

const icons = { success: CheckCircle2, warning: CircleAlert, error: CircleX, info: Info };

export function Alert({ title, description, variant = 'info', style, ...props }: AlertProps) {
  const { tokens } = useTheme();
  const colorName = variant === 'error' ? 'destructive' : variant;
  const color = tokens.colors[colorName];
  const Icon = icons[variant];

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor: `${color}14`,
          borderColor: `${color}42`,
          borderRadius: tokens.radius.md,
        },
        style,
      ]}
      {...props}
    >
      <Icon color={color} size={21} />
      <View style={styles.copy}>
        <AppText style={{ color }} variant="label" weight="semibold">
          {title}
        </AppText>
        {description ? (
          <AppText color="textSecondary" variant="bodySmall">
            {description}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  copy: { flex: 1, gap: 2 },
});
