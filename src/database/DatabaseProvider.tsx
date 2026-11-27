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
import { CollectionService } from '@/features/collections/services/CollectionService';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentReversalService } from '@/features/payments/services/PaymentReversalService';
import { PaymentService } from '@/features/payments/services/PaymentService';
import { ReminderService } from '@/features/notifications/services/ReminderService';
import { ReportExportService } from '@/features/reports/services/ReportExportService';
import { VehicleService } from '@/features/vehicles/services/VehicleService';
import { ExpoNotificationGateway } from '@/services/notifications/ExpoNotificationGateway';
import { ExpoReportFileGateway } from '@/services/reports/ExpoReportFileGateway';
import { ReactNativeWhatsAppGateway } from '@/services/whatsapp/ReactNativeWhatsAppGateway';

import {
  initializeDatabase,
  resetDatabaseInitializationForRetry,
  type DatabaseEnvironment,
} from './client';
import { AppDatabaseError } from './errors/DatabaseError';
import { AuditRepository } from './repositories/audit.repository';
import { CustomerRepository } from './repositories/customer.repository';
import { CollectionRepository } from './repositories/collection.repository';
import { CustomerHistoryRepository } from './repositories/customer-history.repository';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DebtRepository } from './repositories/debt.repository';
import { GlobalSearchRepository } from './repositories/global-search.repository';
import { PaymentReversalRepository } from './repositories/payment-reversal.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { ReminderRepository } from './repositories/reminder.repository';
import { ReportRepository } from './repositories/report.repository';
import { SettingsRepository } from './repositories/settings.repository';
import { VehicleRepository } from './repositories/vehicle.repository';
import { WorkspaceRepository } from './repositories/workspace.repository';

export type DatabaseStatus = 'initializing' | 'ready' | 'error';

export interface DatabaseContextValue extends DatabaseEnvironment {
  status: 'ready';
  repositories: {
    workspaces: WorkspaceRepository;
    customers: CustomerRepository;
    customerHistory: CustomerHistoryRepository;
    dashboard: DashboardRepository;
    globalSearch: GlobalSearchRepository;
    vehicles: VehicleRepository;
    debts: DebtRepository;
    payments: PaymentRepository;
    reversals: PaymentReversalRepository;
    audit: AuditRepository;
    reminders: ReminderRepository;
    settings: SettingsRepository;
    collections: CollectionRepository;
    reports: ReportRepository;
  };
  services: {
    customers: CustomerService;
    vehicles: VehicleService;
    debts: DebtService;
    payments: PaymentService;
    reversals: PaymentReversalService;
    reminders: ReminderService;
    collections: CollectionService;
    reportExport: ReportExportService;
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
    const collectionRepository = new CollectionRepository(executor);
    const settingsRepository = new SettingsRepository(executor);
    const collectionService = new CollectionService(
      collectionRepository,
      settingsRepository,
      new ReactNativeWhatsAppGateway(),
    );
    const reconcileFinancialChange = async () => {
      await reminderService.reconcile(environment.workspace.id, environment.workspace.timezone);
    };
    return {
      ...environment,
      status: 'ready',
      repositories: {
        workspaces: new WorkspaceRepository(executor),
        customers: new CustomerRepository(executor),
        customerHistory: new CustomerHistoryRepository(executor),
        dashboard: new DashboardRepository(executor),
        globalSearch: new GlobalSearchRepository(executor),
        vehicles: new VehicleRepository(executor),
        debts: new DebtRepository(executor),
        payments: new PaymentRepository(executor),
        reversals: new PaymentReversalRepository(executor),
        audit: new AuditRepository(executor),
        reminders: new ReminderRepository(executor),
        settings: settingsRepository,
        collections: collectionRepository,
        reports: new ReportRepository(executor),
      },
      services: {
        customers: new CustomerService(executor),
        vehicles: new VehicleService(executor),
        debts: new DebtService(executor, reconcileFinancialChange),
        payments: new PaymentService(executor, reconcileFinancialChange),
        reversals: new PaymentReversalService(executor, reconcileFinancialChange),
        reminders: reminderService,
        collections: collectionService,
        reportExport: new ReportExportService(new ExpoReportFileGateway()),
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
