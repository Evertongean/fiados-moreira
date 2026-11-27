import { normalizeBrazilianPhone, onlyDigits } from '@/utils/phone';

export function normalizeWhatsAppPhone(value: string | null | undefined): string | null {
  const normalized = normalizeBrazilianPhone(value);
  return normalized ? onlyDigits(normalized) : null;
}
