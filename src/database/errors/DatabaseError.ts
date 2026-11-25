export const databaseErrorCodes = [
  'DATABASE_INITIALIZATION_FAILED',
  'MIGRATION_FAILED',
  'RECORD_NOT_FOUND',
  'VALIDATION_ERROR',
  'WORKSPACE_MISMATCH',
  'CONSTRAINT_VIOLATION',
  'INVALID_AMOUNT',
  'PAYMENT_EXCEEDS_BALANCE',
  'DEBT_ALREADY_PAID',
  'DEBT_CANCELED',
  'PAYMENT_ALREADY_REVERSED',
  'IDEMPOTENCY_CONFLICT',
  'TRANSACTION_FAILED',
  'CUSTOMER_NOT_FOUND',
  'CUSTOMER_VALIDATION_ERROR',
  'CUSTOMER_ALREADY_ARCHIVED',
  'CUSTOMER_ARCHIVED',
  'CUSTOMER_NOT_ARCHIVED',
  'CUSTOMER_HAS_OUTSTANDING_DEBT',
  'CUSTOMER_WORKSPACE_MISMATCH',
  'CUSTOMER_CREATION_FAILED',
  'CUSTOMER_UPDATE_FAILED',
  'CUSTOMER_ARCHIVE_FAILED',
  'UNKNOWN_ERROR',
] as const;

export type DatabaseErrorCode = (typeof databaseErrorCodes)[number];

export class AppDatabaseError extends Error {
  constructor(
    public readonly code: DatabaseErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AppDatabaseError';
  }
}

export function mapDatabaseError(error: unknown): AppDatabaseError {
  if (error instanceof AppDatabaseError) return error;

  const message = error instanceof Error ? error.message : String(error);
  if (/constraint|foreign key|unique/i.test(message)) {
    return new AppDatabaseError(
      'CONSTRAINT_VIOLATION',
      'A operação viola uma regra de integridade dos dados.',
      { cause: error },
    );
  }

  return new AppDatabaseError('UNKNOWN_ERROR', 'Não foi possível concluir a operação.', {
    cause: error,
  });
}
