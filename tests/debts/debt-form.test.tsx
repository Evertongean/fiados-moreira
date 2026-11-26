import { zodResolver } from '@hookform/resolvers/zod';
import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui';
import { DebtForm } from '@/features/debts/components/DebtForm';
import {
  debtFormSchema,
  type DebtFormOutput,
  type DebtFormValues,
} from '@/features/debts/domain/debtSchemas';

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

const defaults: DebtFormValues = {
  customerId,
  vehicleId: '',
  description: '',
  totalCents: null,
  serviceDate: '26/11/2026',
  dueDate: '',
  notes: '',
};

function Harness({ onSubmit }: { onSubmit: (values: DebtFormOutput) => void }) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DebtFormValues, unknown, DebtFormOutput>({
    defaultValues: defaults,
    resolver: zodResolver(debtFormSchema),
  });
  return (
    <>
      <DebtForm
        control={control}
        customerLocked
        customers={customers}
        errors={errors}
        vehicles={[]}
      />
      <Button label="Salvar fiado" onPress={() => void handleSubmit(onSubmit)()} />
    </>
  );
}

describe('DebtForm', () => {
  it('renders accessible fields and submits integer cents with civil dates', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await renderWithTheme(<Harness onSubmit={onSubmit} />);

    expect(screen.getByText('Cliente Teste')).toBeOnTheScreen();
    expect(screen.getByLabelText('Serviço ou produto *')).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor total *')).toBeOnTheScreen();
    expect(screen.getByLabelText('Data do serviço *')).toHaveProp('value', '26/11/2026');

    await user.type(screen.getByLabelText('Serviço ou produto *'), 'Troca de óleo');
    fireEvent.changeText(screen.getByLabelText('Valor total *'), 'R$ 150,00');
    await user.press(screen.getByRole('button', { name: 'Salvar fiado' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId,
        description: 'Troca de óleo',
        totalCents: 15_000,
        serviceDate: '26/11/2026',
      }),
      undefined,
    );
  });
});
