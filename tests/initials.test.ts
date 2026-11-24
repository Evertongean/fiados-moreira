import { getInitials } from '@/utils/initials';

describe('getInitials', () => {
  it('uses the first and last names', () => {
    expect(getInitials('Maria da Silva')).toBe('MS');
  });

  it('handles a single name and extra spaces', () => {
    expect(getInitials('  ana  ')).toBe('A');
  });

  it('returns the configured fallback for an empty name', () => {
    expect(getInitials('', 'FM')).toBe('FM');
  });
});
