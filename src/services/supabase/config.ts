export type SupabaseConfiguration =
  | { status: 'configured'; url: string; publishableKey: string }
  | { status: 'unconfigured'; reason: 'missing_url' | 'missing_publishable_key' }
  | { status: 'invalid'; reason: 'invalid_url' | 'placeholder_value' };

export interface SupabaseEnvironment {
  url?: string;
  publishableKey?: string;
}

export function readSupabaseConfiguration(
  environment: SupabaseEnvironment = {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
): SupabaseConfiguration {
  const url = environment.url?.trim();
  const publishableKey = environment.publishableKey?.trim();
  if (!url) return { status: 'unconfigured', reason: 'missing_url' };
  if (!publishableKey) {
    return { status: 'unconfigured', reason: 'missing_publishable_key' };
  }
  if (isPlaceholder(url) || isPlaceholder(publishableKey)) {
    return { status: 'invalid', reason: 'placeholder_value' };
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      return { status: 'invalid', reason: 'invalid_url' };
    }
  } catch {
    return { status: 'invalid', reason: 'invalid_url' };
  }
  return { status: 'configured', url, publishableKey };
}

function isPlaceholder(value: string): boolean {
  const normalized = value.toLocaleLowerCase('pt-BR');
  return normalized.includes('seu-projeto') || normalized.includes('substitua');
}
