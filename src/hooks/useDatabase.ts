import { useContext } from 'react';

import { DatabaseContext } from '@/database/DatabaseProvider';

export function useDatabase() {
  const value = useContext(DatabaseContext);
  if (!value) throw new Error('useDatabase deve ser usado dentro de DatabaseProvider.');
  return value;
}
