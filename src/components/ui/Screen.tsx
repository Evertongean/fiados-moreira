import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import type { SpacingKey } from '@/theme/spacing';

export interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  keyboardAware?: boolean;
  padding?: SpacingKey | 'none';
  safeAreaEdges?: Edge[];
  contentContainerStyle?: ViewStyle;
  scrollViewProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
}

export function Screen({
  children,
  scroll = false,
  keyboardAware = false,
  padding = 4,
  safeAreaEdges = ['top', 'right', 'bottom', 'left'],
  contentContainerStyle,
  scrollViewProps,
}: ScreenProps) {
  const { tokens } = useTheme();
  const paddingValue = padding === 'none' ? 0 : tokens.spacing[padding];
  const contentStyle = [styles.content, { padding: paddingValue }, contentContainerStyle];
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={contentStyle}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={contentStyle}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[styles.safeArea, { backgroundColor: tokens.colors.background }]}
    >
      {keyboardAware ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.safeArea}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flexGrow: 1 },
});
