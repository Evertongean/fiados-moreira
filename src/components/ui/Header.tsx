import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';

export interface HeaderProps extends ViewProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  align?: 'left' | 'center';
}

export function Header({
  title,
  subtitle,
  onBack,
  rightAction,
  align = 'left',
  style,
  ...props
}: HeaderProps) {
  return (
    <View style={[styles.container, style]} {...props}>
      {onBack ? (
        <IconButton accessibilityLabel="Voltar" icon={ArrowLeft} onPress={onBack} variant="ghost" />
      ) : null}
      <View style={[styles.text, align === 'center' && styles.center]}>
        <AppText align={align} accessibilityRole="header" variant="h3">
          {title}
        </AppText>
        {subtitle ? (
          <AppText align={align} color="textSecondary" variant="bodySmall">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {rightAction ? (
        <View style={styles.action}>{rightAction}</View>
      ) : onBack ? (
        <View style={styles.placeholder} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { flex: 1, gap: 2 },
  center: { alignItems: 'center' },
  action: { alignItems: 'flex-end' },
  placeholder: { width: 48 },
});
