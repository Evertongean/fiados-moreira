import {
  Switch as NativeSwitch,
  StyleSheet,
  View,
  type SwitchProps as NativeSwitchProps,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/hooks/useTheme';

export interface SwitchProps extends NativeSwitchProps {
  label: string;
  description?: string;
}

export function Switch({ label, description, disabled, ...props }: SwitchProps) {
  const { tokens } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <AppText color={disabled ? 'disabled' : 'foreground'} variant="label">
          {label}
        </AppText>
        {description ? (
          <AppText color="textMuted" variant="caption">
            {description}
          </AppText>
        ) : null}
      </View>
      <NativeSwitch
        accessibilityLabel={label}
        disabled={disabled}
        ios_backgroundColor={tokens.colors.input}
        thumbColor={tokens.colors.surface}
        trackColor={{ false: tokens.colors.input, true: tokens.colors.primary }}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  copy: { flex: 1, gap: 2 },
});
