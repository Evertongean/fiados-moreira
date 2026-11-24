import { canAccessDevelopmentRoutes, getRouteId } from '@/utils/routes';

describe('route parameters', () => {
  it.each(['customer-123', '01JABC_DEF', 'a'])('accepts a safe identifier: %s', (id) => {
    expect(getRouteId(id)).toBe(id);
  });

  it.each([undefined, [], ['one', 'two'], '', '/unsafe', 'with space', `a${'b'.repeat(128)}`])(
    'rejects missing or unsafe route parameters: %p',
    (value) => {
      expect(getRouteId(value)).toBeNull();
    },
  );
});

describe('development route protection', () => {
  it('allows the gallery only in development bundles', () => {
    expect(canAccessDevelopmentRoutes(true)).toBe(true);
    expect(canAccessDevelopmentRoutes(false)).toBe(false);
  });
});
