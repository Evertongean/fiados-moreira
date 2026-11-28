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
    phone: '+5584999999999',
    whatsapp: '+5584999999999',
    address: 'Rua da Oficina, 10',
    notes: null,
    createdAt: '2026-11-26T12:00:00.000Z',
    updatedAt: '2026-11-26T12:00:00.000Z',
    archivedAt: null,
    deletedAt: null,
  },
];

const defaults: DebtFormValues = {
  customerId,
  customer: {
    name: 'Cliente Teste',
    phone: '(84) 99999-9999',
    address: 'Rua da Oficina, 10',
  },
  vehicleId: '',
  description: '',
  totalCents: null,
  serviceDate: '26/11/2026',
  dueDate: '',
  notes: '',
};

function Harness({
  onSubmit,
  initialValues = defaults,
  customerLocked = true,
}: {
  onSubmit: (values: DebtFormOutput) => void;
  initialValues?: DebtFormValues;
  customerLocked?: boolean;
}) {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DebtFormValues, unknown, DebtFormOutput>({
    defaultValues: initialValues,
    resolver: zodResolver(debtFormSchema),
  });
  return (
    <>
      <DebtForm
        control={control}
        customerLocked={customerLocked}
        customers={customers}
        errors={errors}
        setValue={setValue}
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
    expect(screen.getByLabelText('Descrição do serviço ou produto *')).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor total *')).toBeOnTheScreen();
    expect(screen.getByLabelText('Data do fiado *')).toHaveProp('value', '26/11/2026');

    await user.type(screen.getByLabelText('Descrição do serviço ou produto *'), 'Troca de óleo');
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

  it('finds an existing customer by phone and fills their data', async () => {
    const user = userEvent.setup();
    await renderWithTheme(
      <Harness
        customerLocked={false}
        initialValues={{
          ...defaults,
          customerId: '',
          customer: { name: '', phone: '', address: '' },
        }}
        onSubmit={jest.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Buscar cliente existente (opcional)'), '999999999');
    await user.press(screen.getByRole('radio', { name: 'Cliente Teste' }));

    expect(screen.getByText('Cliente selecionado')).toBeOnTheScreen();
    expect(screen.getByText('(84) 99999-9999')).toBeOnTheScreen();
    expect(screen.getByText('Rua da Oficina, 10')).toBeOnTheScreen();
  });
});
