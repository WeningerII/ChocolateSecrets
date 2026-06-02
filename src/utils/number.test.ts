import { describe, it, expect } from 'vitest';
import { parseLocaleNumber } from './number';

describe('parseLocaleNumber', () => {
  it('parses plain US-format numbers', () => {
    expect(parseLocaleNumber('3.50')).toEqual({ value: 3.5, ok: true });
    expect(parseLocaleNumber('1234.56')).toEqual({ value: 1234.56, ok: true });
    expect(parseLocaleNumber('42')).toEqual({ value: 42, ok: true });
  });

  it('parses European comma decimals (the previously-corrupted case)', () => {
    expect(parseLocaleNumber('1,50')).toEqual({ value: 1.5, ok: true });
    expect(parseLocaleNumber('3,50')).toEqual({ value: 3.5, ok: true });
  });

  it('handles thousands separators in both conventions', () => {
    expect(parseLocaleNumber('1,234.56')).toEqual({ value: 1234.56, ok: true }); // US
    expect(parseLocaleNumber('1.234,56')).toEqual({ value: 1234.56, ok: true }); // EU
    expect(parseLocaleNumber('1,234,567')).toEqual({ value: 1234567, ok: true });
    expect(parseLocaleNumber('1.234.567')).toEqual({ value: 1234567, ok: true });
  });

  it('strips currency symbols and whitespace', () => {
    expect(parseLocaleNumber('$3.50')).toEqual({ value: 3.5, ok: true });
    expect(parseLocaleNumber(' 1 234,56 ')).toEqual({ value: 1234.56, ok: true });
    expect(parseLocaleNumber('€2,00')).toEqual({ value: 2, ok: true });
  });

  it('handles negatives and accounting parentheses', () => {
    expect(parseLocaleNumber('-5')).toEqual({ value: -5, ok: true });
    expect(parseLocaleNumber('(5)')).toEqual({ value: -5, ok: true });
  });

  it('treats blank as provided-zero but flags non-numeric junk for review', () => {
    expect(parseLocaleNumber('')).toEqual({ value: 0, ok: true });
    expect(parseLocaleNumber('   ')).toEqual({ value: 0, ok: true });
    expect(parseLocaleNumber('N/A')).toEqual({ value: 0, ok: false });
    expect(parseLocaleNumber('abc')).toEqual({ value: 0, ok: false });
    expect(parseLocaleNumber(null)).toEqual({ value: 0, ok: false });
  });

  it('passes through finite numbers and rejects NaN/Infinity', () => {
    expect(parseLocaleNumber(12.5)).toEqual({ value: 12.5, ok: true });
    expect(parseLocaleNumber(NaN)).toEqual({ value: 0, ok: false });
    expect(parseLocaleNumber(Infinity)).toEqual({ value: 0, ok: false });
  });
});
