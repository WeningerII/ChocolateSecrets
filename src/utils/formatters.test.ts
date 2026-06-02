import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatters';

describe('formatCurrency', () => {
  it('defaults to USD and formats with en-US grouping', () => {
    const out = formatCurrency(1234.5, 'en');
    expect(out).toContain('$');
    expect(out).toContain('1,234.50');
  });

  it('honors a non-USD currency code (the bill currency)', () => {
    expect(formatCurrency(1234.5, 'en', 'EUR')).toContain('€');
    expect(formatCurrency(1234.5, 'en', 'GBP')).toContain('£');
  });

  it('is case-insensitive about the currency code', () => {
    expect(formatCurrency(10, 'en', 'usd')).toBe(formatCurrency(10, 'en', 'USD'));
  });

  it('falls back to USD on an invalid currency code instead of throwing', () => {
    // Gemini bill extraction can emit garbage like "dollars" or an empty string;
    // Intl.NumberFormat would otherwise throw RangeError and blank the page.
    expect(() => formatCurrency(10, 'en', 'dollars')).not.toThrow();
    expect(() => formatCurrency(10, 'en', '')).not.toThrow();
    expect(formatCurrency(10, 'en', 'not-a-code')).toBe(formatCurrency(10, 'en', 'USD'));
  });

  it('applies the locale of the active language', () => {
    // es-ES uses a comma decimal separator; the exact symbol placement is ICU
    // dependent, so assert the locale-specific decimal handling rather than bytes.
    const es = formatCurrency(1234.5, 'es', 'EUR');
    expect(es).toContain('1234,50'.slice(-3)); // ",50" decimal comma
    expect(es).toContain('€');
  });
});
