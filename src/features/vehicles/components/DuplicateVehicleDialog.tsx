import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import type { PotentialVehicleDuplicate } from '@/features/vehicles/domain/vehicleTypes';
import { useTheme } from '@/hooks/useTheme';
import { formatBrazilianPlate } from '@/utils/plate';

export interface DuplicateVehicleDialogProps {
  visible: boolean;
  duplicates: PotentialVehicleDuplicate[];
  loading?: boolean;
  onView: (id: string) => void;
  onContinue: () => void;
  onCancel: () => void;
}

export function DuplicateVehicleDialog({
  visible,
  duplicates,
  loading = false,
  onView,
  onContinue,
  onCancel,
}: DuplicateVehicleDialogProps) {
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
          accessibilityLabel="Fechar aviso de placa duplicada"
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
          ]}
        >
          <View style={styles.copy}>
            <AppText accessibilityRole="header" variant="h3">
              Possível placa duplicada
            </AppText>
            <AppText color="textSecondary">
              Já existe veículo com esta placa. Verifique o cadastro antes de continuar.
            </AppText>
          </View>
          <ScrollView contentContainerStyle={styles.list} style={styles.scroll}>
            {duplicates.slice(0, 3).map(({ vehicle }) => (
              <Card key={vehicle.id} variant="outlined">
                <View style={styles.vehicle}>
                  <View style={styles.vehicleCopy}>
                    <AppText variant="label" weight="semibold">
                      {vehicle.brand} {vehicle.model}
                    </AppText>
                    <AppText color="textMuted" variant="caption">
                      {formatBrazilianPlate(vehicle.plate)}
                    </AppText>
                  </View>
                  <Button
                    disabled={loading}
                    label="Ver veículo"
                    onPress={() => onView(vehicle.id)}
                    size="sm"
                    variant="ghost"
                  />
                </View>
              </Card>
            ))}
          </ScrollView>
          <View style={styles.actions}>
            <Button disabled={loading} label="Cancelar" onPress={onCancel} variant="ghost" />
            <Button
              label="Continuar cadastro"
              loading={loading}
              onPress={onContinue}
              variant="primary"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 460, maxHeight: '84%', gap: 18, padding: 20, borderWidth: 1 },
  copy: { gap: 8 },
  scroll: { flexGrow: 0 },
  list: { gap: 8 },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vehicleCopy: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
});
