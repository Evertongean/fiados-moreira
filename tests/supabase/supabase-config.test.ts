import { readSupabaseConfiguration } from '@/services/supabase/config';

describe('Supabase configuration', () => {
  it('keeps the app operational when credentials are absent', () => {
    expect(readSupabaseConfiguration({})).toEqual({
      status: 'unconfigured',
      reason: 'missing_url',
    });
    expect(readSupabaseConfiguration({ url: 'https://project.supabase.co' })).toEqual({
      status: 'unconfigured',
      reason: 'missing_publishable_key',
    });
  });

  it('rejects placeholders, malformed URLs and credentials embedded in URLs', () => {
    expect(
      readSupabaseConfiguration({
        url: 'https://seu-projeto.supabase.co',
        publishableKey: 'sb_publishable_substitua_aqui',
      }),
    ).toMatchObject({ status: 'invalid' });
    expect(readSupabaseConfiguration({ url: 'not-a-url', publishableKey: 'public-key' })).toEqual({
      status: 'invalid',
      reason: 'invalid_url',
    });
    expect(
      readSupabaseConfiguration({
        url: 'https://user:password@project.supabase.co',
        publishableKey: 'public-key',
      }),
    ).toEqual({ status: 'invalid', reason: 'invalid_url' });
  });

  it('accepts hosted and local public client configuration', () => {
    expect(
      readSupabaseConfiguration({
        url: 'https://project.supabase.co',
        publishableKey: 'sb_publishable_test_only',
      }),
    ).toEqual({
      status: 'configured',
      url: 'https://project.supabase.co',
      publishableKey: 'sb_publishable_test_only',
    });
    expect(
      readSupabaseConfiguration({
        url: 'http://127.0.0.1:54321',
        publishableKey: 'local-publishable-key',
      }),
    ).toMatchObject({ status: 'configured' });
  });
});
