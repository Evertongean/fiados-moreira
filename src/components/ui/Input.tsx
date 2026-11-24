import type { LucideIcon } from 'lucide-react-native';
import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/hooks/useTheme';

export interface InputProps extends TextInputProps {
  label?: string;
  helpText?: string;
  error?: string;
  startIcon?: LucideIcon;
  endIcon?: LucideIcon;
  endAccessory?: ReactNode;
}

export type InputRef = ComponentRef<typeof TextInput>;

export const Input = forwardRef<InputRef, InputProps>(function Input(
  {
    label,
    helpText,
    error,
    startIcon: StartIcon,
    endIcon: EndIcon,
    endAccessory,
    accessibilityLabel,
    editable = true,
    readOnly = false,
    style,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const { tokens } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const isDisabled = !editable;
  const borderColor = error
    ? tokens.colors.destructive
    : isFocused
      ? tokens.colors.primary
      : tokens.colors.input;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText color={isDisabled ? 'disabled' : 'foreground'} variant="label">
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDisabled ? tokens.colors.surfaceSecondary : tokens.colors.surface,
            borderColor,
            borderRadius: tokens.radius.md,
          },
        ]}
      >
        {StartIcon ? <StartIcon color={tokens.colors.textMuted} size={20} /> : null}
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled: isDisabled }}
          editable={editable}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor={tokens.colors.textMuted}
          readOnly={readOnly}
          ref={ref}
          selectionColor={tokens.colors.primary}
          style={[
            styles.input,
            {
              color: tokens.colors.foreground,
              fontFamily: 'Inter_400Regular',
            },
            style,
          ]}
          {...props}
        />
        {EndIcon ? <EndIcon color={tokens.colors.textMuted} size={20} /> : null}
        {endAccessory}
      </View>
      {error ? (
        <AppText accessibilityLiveRegion="polite" color="destructive" variant="caption">
          {error}
        </AppText>
      ) : helpText ? (
        <AppText color="textMuted" variant="caption">
          {helpText}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { width: '100%', gap: 6 },
  container: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
  },
  input: { flex: 1, minHeight: 48, paddingVertical: 10, fontSize: 16 },
});
