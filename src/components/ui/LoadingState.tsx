import { ActivityIndicator, StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/hooks/useTheme';

export interface LoadingStateProps extends ViewProps {
  label?: string;
  fullScreen?: boolean;
}

export function LoadingState({
  label = 'Carregando…',
  fullScreen = false,
  style,
  ...props
}: LoadingStateProps) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={[styles.container, fullScreen && styles.fullScreen, style]}
      {...props}
    >
      <ActivityIndicator color={tokens.colors.primary} size={fullScreen ? 'large' : 'small'} />
      <AppText color="textSecondary" variant="bodySmall">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  fullScreen: { flex: 1 },
});
