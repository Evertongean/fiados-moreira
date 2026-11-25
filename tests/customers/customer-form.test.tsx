import { zodResolver } from '@hookform/resolvers/zod';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui';
import { CustomerForm } from '@/features/customers/components/CustomerForm';
import {
  customerFormSchema,
  type CustomerFormValues,
} from '@/features/customers/domain/customerSchemas';

import { renderWithTheme } from '../render';

const defaults: CustomerFormValues = {
  name: '',
  phone: '',
  whatsapp: '',
  address: '',
  notes: '',
  usePhoneForWhatsapp: true,
};

function Harness({ onSubmit }: { onSubmit: (values: CustomerFormValues) => void }) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    defaultValues: defaults,
    resolver: zodResolver(customerFormSchema),
  });
  return (
    <>
      <CustomerForm control={control} errors={errors} />
      <Button label="Salvar cliente" onPress={() => void handleSubmit(onSubmit)()} />
    </>
  );
}

describe('CustomerForm', () => {
  it('renders accessible fields and keeps WhatsApp duplication optional', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await renderWithTheme(<Harness onSubmit={onSubmit} />);
    expect(screen.getByLabelText('Nome completo *')).toBeOnTheScreen();
    expect(screen.getByLabelText('Telefone (opcional)')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Usar o telefone também no WhatsApp').props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: true }));
    expect(screen.queryByLabelText('WhatsApp (opcional)')).toBeNull();
    expect(screen.getByText('Evite registrar informações pessoais sensíveis.')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Nome completo *'), 'Maria José');
    await user.press(screen.getByRole('button', { name: 'Salvar cliente' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Maria José' }),
      undefined,
    );

    await user.press(screen.getByRole('checkbox'));
    expect(screen.getByLabelText('WhatsApp (opcional)')).toBeOnTheScreen();
  });
});
