import * as Haptics from 'expo-haptics';
import { CheckCircle2, CircleAlert, CircleX, Info, X } from 'lucide-react-native';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/hooks/useTheme';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ShowToastOptions extends Omit<ToastMessage, 'id'> {
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ShowToastOptions) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const icons = { success: CheckCircle2, error: CircleX, warning: CircleAlert, info: Info };

export function ToastProvider({ children }: PropsWithChildren) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const showToast = useCallback(
    ({ duration = 3200, ...message }: ShowToastOptions) => {
      const id = ++nextId.current;
      setMessages((current) => [...current.slice(-2), { id, ...message }]);

      if (message.variant !== 'info') {
        const feedbackType =
          message.variant === 'success'
            ? Haptics.NotificationFeedbackType.Success
            : message.variant === 'warning'
              ? Haptics.NotificationFeedbackType.Warning
              : Haptics.NotificationFeedbackType.Error;
        void Haptics.notificationAsync(feedbackType);
      }

      setTimeout(() => dismissToast(id), duration);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport messages={messages} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  messages,
  onDismiss,
}: {
  messages: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.viewport, { top: insets.top + 8 }]}>
      {messages.map((message) => {
        const colorName = message.variant === 'error' ? 'destructive' : message.variant;
        const color = tokens.colors[colorName];
        const Icon = icons[message.variant];
        return (
          <Animated.View
            accessibilityLiveRegion="polite"
            entering={FadeInDown.duration(180).reduceMotion(ReduceMotion.System)}
            exiting={FadeOutUp.duration(160).reduceMotion(ReduceMotion.System)}
            key={message.id}
            style={[
              styles.toast,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: `${color}55`,
                borderRadius: tokens.radius.md,
              },
              tokens.shadows.md,
            ]}
          >
            <Icon color={color} size={22} />
            <View style={styles.copy}>
              <AppText variant="label" weight="semibold">
                {message.title}
              </AppText>
              {message.description ? (
                <AppText color="textSecondary" variant="caption">
                  {message.description}
                </AppText>
              ) : null}
            </View>
            <IconButton
              accessibilityLabel="Fechar mensagem"
              icon={X}
              onPress={() => onDismiss(message.id)}
              size="sm"
              variant="ghost"
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }
  return context;
}

const styles = StyleSheet.create({
  viewport: { position: 'absolute', right: 12, left: 12, zIndex: 1000, gap: 8 },
  toast: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
  copy: { flex: 1, gap: 2 },
});
