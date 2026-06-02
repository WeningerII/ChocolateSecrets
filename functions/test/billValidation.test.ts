import { describe, it, expect } from 'vitest';
import {
  sanitizeAmount,
  finiteOrNull,
  sanitizeCurrency,
  parsePlausibleDate,
  isAllowedStoragePath,
  MAX_BILL_AMOUNT,
} from '../src/utils/billValidation';

describe('sanitizeAmount', () => {
  it('keeps valid amounts, rounded to cents', () => {
    expect(sanitizeAmount(12.5)).toBe(12.5);
    expect(sanitizeAmount(12.005)).toBe(12.01);
  });
  it('zeroes negatives, NaN, Infinity, and non-numbers', () => {
    expect(sanitizeAmount(-5)).toBe(0);
    expect(sanitizeAmount(NaN)).toBe(0);
    expect(sanitizeAmount(Infinity)).toBe(0);
    expect(sanitizeAmount('100' as unknown)).toBe(0);
    expect(sanitizeAmount(null)).toBe(0);
  });
  it('caps absurd magnitudes', () => {
    expect(sanitizeAmount(1e15)).toBe(MAX_BILL_AMOUNT);
  });
});

describe('finiteOrNull', () => {
  it('keeps finite numbers, nulls everything else', () => {
    expect(finiteOrNull(3)).toBe(3);
    expect(finiteOrNull(0)).toBe(0);
    expect(finiteOrNull(NaN)).toBeNull();
    expect(finiteOrNull(undefined)).toBeNull();
    expect(finiteOrNull('2' as unknown)).toBeNull();
  });
});

describe('sanitizeCurrency', () => {
  it('accepts 3-letter codes (case-insensitive)', () => {
    expect(sanitizeCurrency('eur')).toBe('EUR');
    expect(sanitizeCurrency('USD')).toBe('USD');
  });
  it('falls back to USD on junk', () => {
    expect(sanitizeCurrency('dollars')).toBe('USD');
    expect(sanitizeCurrency('')).toBe('USD');
    expect(sanitizeCurrency(42 as unknown)).toBe('USD');
  });
});

describe('parsePlausibleDate', () => {
  it('parses ISO dates in the plausible window', () => {
    expect(parsePlausibleDate('2025-03-15')?.getUTCFullYear()).toBe(2025);
  });
  it('rejects junk and out-of-range years', () => {
    expect(parsePlausibleDate('not-a-date')).toBeNull();
    expect(parsePlausibleDate('1850-01-01')).toBeNull();
    expect(parsePlausibleDate('9999-01-01')).toBeNull();
    expect(parsePlausibleDate('')).toBeNull();
    expect(parsePlausibleDate(undefined)).toBeNull();
  });
});

describe('isAllowedStoragePath', () => {
  const uid = 'user123';
  it('allows the caller’s own bills prefix', () => {
    expect(isAllowedStoragePath('bills/user123/invoice.png', uid)).toBe(true);
  });
  it('blocks traversal, absolute paths, URLs, and other tenants', () => {
    expect(isAllowedStoragePath('bills/otherUser/invoice.png', uid)).toBe(false);
    expect(isAllowedStoragePath('bills/user123/../../secrets.png', uid)).toBe(false);
    expect(isAllowedStoragePath('/etc/passwd', uid)).toBe(false);
    expect(isAllowedStoragePath('gs://bucket/file', uid)).toBe(false);
    expect(isAllowedStoragePath('', uid)).toBe(false);
    expect(isAllowedStoragePath(undefined, uid)).toBe(false);
  });
});
