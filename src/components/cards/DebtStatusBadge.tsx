import { Badge, type BadgeVariant } from '@/components/ui/Badge';

export type DebtStatus = 'pending' | 'overdue' | 'partial' | 'paid';

export interface DebtStatusBadgeProps {
  status: DebtStatus;
}

const statusConfig: Record<DebtStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  overdue: { label: 'Atrasado', variant: 'destructive' },
  partial: { label: 'Parcialmente pago', variant: 'info' },
  paid: { label: 'Quitado', variant: 'success' },
};

export function DebtStatusBadge({ status }: DebtStatusBadgeProps) {
  return <Badge {...statusConfig[status]} />;
}
