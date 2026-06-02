import { Language } from '../types';

const LOCALES: Record<Language, string> = { en: 'en-US', es: 'es-ES', ko: 'ko-KR' };

/**
 * Normalizes a currency code to a valid ISO-4217-shaped value. `Intl.NumberFormat`
 * throws a RangeError on anything that isn't a recognizable 3-letter code, so
 * unvalidated values — e.g. a `currency` string extracted from a bill image by the
 * AI — must be guarded or a single bad bill can crash the whole render tree.
 */
function normalizeCurrencyCode(code?: string | null): string {
  if (code && /^[A-Za-z]{3}$/.test(code)) return code.toUpperCase();
  return 'USD';
}

/**
 * Formats a monetary amount using the active UI language for locale-specific
 * grouping/decimal separators and the document's own currency for the symbol.
 * Defaults to USD when no currency is supplied (internal costs/margins).
 */
export const formatCurrency = (
  amount: number,
  lang: Language,
  currency: string = 'USD',
): string => {
  return new Intl.NumberFormat(LOCALES[lang], {
    style: 'currency',
    currency: normalizeCurrencyCode(currency),
  }).format(amount);
};
