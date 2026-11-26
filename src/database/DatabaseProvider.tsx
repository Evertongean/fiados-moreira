import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { Alert, Button, LoadingState, Screen } from '@/components/ui';
import { CustomerService } from '@/features/customers/services/CustomerService';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentReversalService } from '@/features/payments/services/PaymentReversalService';
import { PaymentService } from '@/features/payments/services/PaymentService';
import { ReminderService } from '@/features/notifications/services/ReminderService';
import { VehicleService } from '@/features/vehicles/services/VehicleService';
import { ExpoNotificationGateway } from '@/services/notifications/ExpoNotificationGateway';

import {
  initializeDatabase,
  resetDatabaseInitializationForRetry,
  type DatabaseEnvironment,
} from './client';
import { AppDatabaseError } from './errors/DatabaseError';
import { AuditRepository } from './repositories/audit.repository';
import { CustomerRepository } from './repositories/customer.repository';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DebtRepository } from './repositories/debt.repository';
import { GlobalSearchRepository } from './repositories/global-search.repository';
import { PaymentReversalRepository } from './repositories/payment-reversal.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { ReminderRepository } from './repositories/reminder.repository';
import { SettingsRepository } from './repositories/settings.repository';
import { VehicleRepository } from './repositories/vehicle.repository';
import { WorkspaceRepository } from './repositories/workspace.repository';

export type DatabaseStatus = 'initializing' | 'ready' | 'error';

export interface DatabaseContextValue extends DatabaseEnvironment {
  status: 'ready';
  repositories: {
    workspaces: WorkspaceRepository;
    customers: CustomerRepository;
    dashboard: DashboardRepository;
    globalSearch: GlobalSearchRepository;
    vehicles: VehicleRepository;
    debts: DebtRepository;
    payments: PaymentRepository;
    reversals: PaymentReversalRepository;
    audit: AuditRepository;
    reminders: ReminderRepository;
    settings: SettingsRepository;
  };
  services: {
    customers: CustomerService;
    vehicles: VehicleService;
    debts: DebtService;
    payments: PaymentService;
    reversals: PaymentReversalService;
    reminders: ReminderService;
  };
}

export const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<DatabaseStatus>('initializing');
  const [environment, setEnvironment] = useState<DatabaseEnvironment | null>(null);

  const load = useCallback(() => {
    void initializeDatabase().then(
      (result) => {
        setEnvironment(result);
        setStatus('ready');
      },
      (error: unknown) => {
        const code = error instanceof AppDatabaseError ? error.code : 'UNKNOWN_ERROR';
        console.error(`[database] initialization failed: ${code}`);
        setEnvironment(null);
        setStatus('error');
      },
    );
  }, []);

  useEffect(load, [load]);

  const value = useMemo<DatabaseContextValue | null>(() => {
    if (status !== 'ready' || !environment) return null;
    const executor = environment.executor;
    const reminderService = new ReminderService(executor, new ExpoNotificationGateway());
    const reconcileFinancialChange = async () => {
      await reminderService.reconcile(environment.workspace.id, environment.workspace.timezone);
    };
    return {
      ...environment,
      status: 'ready',
      repositories: {
        workspaces: new WorkspaceRepository(executor),
        customers: new CustomerRepository(executor),
        dashboard: new DashboardRepository(executor),
        globalSearch: new GlobalSearchRepository(executor),
        vehicles: new VehicleRepository(executor),
        debts: new DebtRepository(executor),
        payments: new PaymentRepository(executor),
        reversals: new PaymentReversalRepository(executor),
        audit: new AuditRepository(executor),
        reminders: new ReminderRepository(executor),
        settings: new SettingsRepository(executor),
      },
      services: {
        customers: new CustomerService(executor),
        vehicles: new VehicleService(executor),
        debts: new DebtService(executor, reconcileFinancialChange),
        payments: new PaymentService(executor, reconcileFinancialChange),
        reversals: new PaymentReversalService(executor, reconcileFinancialChange),
        reminders: reminderService,
      },
    };
  }, [environment, status]);

  if (status === 'initializing') {
    return (
      <Screen>
        <LoadingState fullScreen label="Preparando dados locais…" />
      </Screen>
    );
  }

  if (!value) {
    return (
      <Screen>
        <View style={styles.error}>
          <Alert
            description="Seus dados não foram apagados. Verifique o espaço disponível e tente novamente."
            title="Não foi possível abrir os dados locais"
            variant="error"
          />
          <Button
            label="Tentar novamente"
            onPress={() => {
              setStatus('initializing');
              resetDatabaseInitializationForRetry();
              load();
            }}
          />
        </View>
      </Screen>
    );
  }

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

const styles = StyleSheet.create({
  error: { flex: 1, justifyContent: 'center', gap: 16 },
});
