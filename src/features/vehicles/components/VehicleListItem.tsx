import type { VehicleRow } from '@/database/schema';
import { Car, ChevronRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Card } from '@/components/ui';
import { VEHICLE_TYPE_LABELS } from '@/features/vehicles/domain/vehicleUtils';
import { useTheme } from '@/hooks/useTheme';
import { formatBrazilianPlate } from '@/utils/plate';

export function VehicleListItem({
  vehicle,
  onPress,
}: {
  vehicle: VehicleRow;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const detail = [formatBrazilianPlate(vehicle.plate), vehicle.year?.toString()]
    .filter(Boolean)
    .join(' • ');

  return (
    <Card
      accessibilityLabel={`Abrir veículo ${vehicle.brand} ${vehicle.model}`}
      onPress={onPress}
      variant="outlined"
    >
      <View style={styles.row}>
        <View
          style={[
            styles.icon,
            { backgroundColor: tokens.colors.secondary, borderRadius: tokens.radius.full },
          ]}
        >
          <Car color={tokens.colors.primary} size={22} />
        </View>
        <View style={styles.copy}>
          <AppText weight="semibold">
            {vehicle.brand} {vehicle.model}
          </AppText>
          <AppText color="textSecondary" variant="bodySmall">
            {VEHICLE_TYPE_LABELS[vehicle.type]}
            {detail ? ` • ${detail}` : ''}
          </AppText>
          {vehicle.archivedAt ? <Badge label="Arquivado" variant="warning" /> : null}
        </View>
        <ChevronRight color={tokens.colors.textMuted} size={20} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, alignItems: 'flex-start', gap: 3 },
});
