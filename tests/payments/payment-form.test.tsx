import { zodResolver } from '@hookform/resolvers/zod';
import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui';
import { calculateRemainingAfterPayment } from '@/features/debts/domain/finance';
import { PaymentForm } from '@/features/payments/components/PaymentForm';
import {
  paymentFormSchema,
  type PaymentFormOutput,
  type PaymentFormValues,
} from '@/features/payments/domain/paymentSchemas';

import { renderWithTheme } from '../render';

function Harness({ onSubmit }: { onSubmit: (values: PaymentFormOutput) => void }) {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormValues, unknown, PaymentFormOutput>({
    defaultValues: {
      amountCents: null,
      paymentMethod: 'pix',
      paidDate: '26/11/2026',
      notes: '',
    },
    resolver: zodResolver(paymentFormSchema),
  });
  const amountCents = useWatch({ control, name: 'amountCents' });
  const summary = {
    originalCents: 50_000,
    grossPaidCents: 20_000,
    reversedCents: 0,
    netPaidCents: 20_000,
    pendingCents: 30_000,
    paidPercentage: 40,
    isPaid: false,
  };
  const remainingCents =
    amountCents === null ? null : calculateRemainingAfterPayment(summary, amountCents);

  return (
    <>
      <PaymentForm
        control={control}
        errors={errors}
        onPayFull={() => setValue('amountCents', 30_000)}
        pendingCents={30_000}
        remainingCents={remainingCents}
      />
      <Button label="Confirmar" onPress={() => void handleSubmit(onSubmit)()} />
    </>
  );
}

describe('PaymentForm', () => {
  it('uses integer cents, offers full payment and exposes the remaining balance preview', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await renderWithTheme(<Harness onSubmit={onSubmit} />);

    expect(screen.getByText('R$ 300,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Data do pagamento *')).toHaveProp('value', '26/11/2026');
    fireEvent.changeText(screen.getByLabelText('Valor do pagamento *'), 'R$ 200,00');
    await waitFor(() => expect(screen.getByText('R$ 100,00')).toBeOnTheScreen());

    await user.press(screen.getByRole('button', { name: 'Pagar valor total' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Valor do pagamento *')).toHaveProp('value', 'R$ 300,00'),
    );
    expect(screen.getByText('R$ 0,00')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 30_000,
        paymentMethod: 'pix',
        paidDate: '26/11/2026',
      }),
      undefined,
    );
  });
});
