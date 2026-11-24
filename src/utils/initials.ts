export function getInitials(name: string, fallback = '?'): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return fallback;
  }

  const first = parts[0]?.slice(0, 1) ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.slice(0, 1) ?? '') : '';

  return `${first}${last}`.toLocaleUpperCase('pt-BR');
}
