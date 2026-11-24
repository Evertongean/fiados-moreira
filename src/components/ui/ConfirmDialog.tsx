import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { tokens } = useTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={[styles.backdrop, { backgroundColor: `${tokens.colors.overlay}A6` }]}>
        <Pressable
          accessibilityLabel="Fechar diálogo"
          accessibilityRole="button"
          onPress={loading ? undefined : onCancel}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.dialog,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.xl,
            },
            tokens.shadows.lg,
          ]}
        >
          <View style={styles.copy}>
            <AppText accessibilityRole="header" variant="h3">
              {title}
            </AppText>
            <AppText color="textSecondary">{description}</AppText>
          </View>
          <View style={styles.actions}>
            <Button disabled={loading} label={cancelLabel} onPress={onCancel} variant="ghost" />
            <Button
              label={confirmLabel}
              loading={loading}
              onPress={onConfirm}
              variant={destructive ? 'destructive' : 'primary'}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 440, gap: 24, padding: 22, borderWidth: 1 },
  copy: { gap: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
