import { zodResolver } from '@hookform/resolvers/zod';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui';
import { VehicleForm } from '@/features/vehicles/components/VehicleForm';
import {
  vehicleFormSchema,
  type VehicleFormValues,
} from '@/features/vehicles/domain/vehicleSchemas';

import { renderWithTheme } from '../render';

const customerId = '6b05c50a-44cf-4d95-80a7-e0ff8b17c1c8';
const customers = [
  {
    id: customerId,
    workspaceId: 'workspace-test',
    name: 'Cliente Teste',
    phone: null,
    whatsapp: null,
    address: null,
    notes: null,
    createdAt: '2026-11-26T12:00:00.000Z',
    updatedAt: '2026-11-26T12:00:00.000Z',
    archivedAt: null,
    deletedAt: null,
  },
];

const defaults: VehicleFormValues = {
  customerId,
  type: 'car',
  brand: '',
  model: '',
  year: '',
  plate: '',
  color: '',
  notes: '',
};

function Harness({ onSubmit }: { onSubmit: (values: VehicleFormValues) => void }) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    defaultValues: defaults,
    resolver: zodResolver(vehicleFormSchema),
  });
  return (
    <>
      <VehicleForm control={control} customers={customers} errors={errors} ownerLocked />
      <Button label="Salvar veículo" onPress={() => void handleSubmit(onSubmit)()} />
    </>
  );
}

describe('VehicleForm', () => {
  it('renders accessible fields and submits valid vehicle data', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await renderWithTheme(<Harness onSubmit={onSubmit} />);
    expect(screen.getByText('Cliente Teste')).toBeOnTheScreen();
    expect(screen.getByLabelText('Marca *')).toBeOnTheScreen();
    expect(screen.getByLabelText('Modelo *')).toBeOnTheScreen();
    expect(screen.getByLabelText('Placa (opcional)')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Marca *'), 'Honda');
    await user.type(screen.getByLabelText('Modelo *'), 'Civic');
    await user.type(screen.getByLabelText('Placa (opcional)'), 'abc1d23');
    await user.press(screen.getByRole('button', { name: 'Salvar veículo' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ brand: 'Honda', model: 'Civic', plate: 'ABC1D23' }),
      undefined,
    );
  });
});
