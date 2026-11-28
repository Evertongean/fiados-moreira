import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { readSupabaseConfiguration } from '@/services/supabase/config';
import type { Database } from '@/services/supabase/database.types';

export type SupabaseConnectionStatus =
  | { status: 'unconfigured' | 'invalid_configuration' | 'unauthenticated' }
  | { status: 'available' }
  | { status: 'unavailable'; code: 'connection_failed' };

let cachedClient: SupabaseClient<Database> | null | undefined;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (cachedClient !== undefined) return cachedClient;
  const configuration = readSupabaseConfiguration();
  if (configuration.status !== 'configured') {
    cachedClient = null;
    return null;
  }
  try {
    cachedClient = createClient<Database>(configuration.url, configuration.publishableKey, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch {
    cachedClient = null;
  }
  return cachedClient;
}

export async function checkSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  const configuration = readSupabaseConfiguration();
  if (configuration.status === 'unconfigured') return { status: 'unconfigured' };
  if (configuration.status === 'invalid') return { status: 'invalid_configuration' };
  const client = getSupabaseClient();
  if (!client) return { status: 'invalid_configuration' };
  try {
    const { data, error } = await client.auth.getSession();
    if (error) return { status: 'unavailable', code: 'connection_failed' };
    if (!data.session) return { status: 'unauthenticated' };
    const probe = await client.from('workspaces').select('id').limit(1);
    return probe.error
      ? { status: 'unavailable', code: 'connection_failed' }
      : { status: 'available' };
  } catch {
    return { status: 'unavailable', code: 'connection_failed' };
  }
}

export function resetSupabaseClientForTests(): void {
  if (process.env.NODE_ENV === 'test') cachedClient = undefined;
}
