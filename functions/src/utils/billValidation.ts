/**
 * Validation / normalization helpers for AI-extracted bill data.
 *
 * The Gemini `responseSchema` is a generation hint, not an enforced contract — the
 * model can still return negative, NaN, absurd, or malformed values. These must be
 * sanitized before they flow toward the bills ledger or Firestore Timestamp
 * construction. Helpers are kept free of the firebase-admin runtime so they can be
 * unit-tested directly.
 */

// Sanity ceiling for a single bill / line item ($100M). Anything above is treated
// as a hallucination and clamped.
export const MAX_BILL_AMOUNT = 100_000_000;

/** Coerce a monetary value: finite, non-negative, rounded to cents, capped. */
export function sanitizeAmount(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return 0;
  const capped = Math.min(v, MAX_BILL_AMOUNT);
  return Math.round(capped * 100) / 100;
}

/** Optional numeric field (quantity, unitPrice, rate): finite number or null. */
export function finiteOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Normalize a currency code to an ISO-4217-shaped value, defaulting to USD. */
export function sanitizeCurrency(v: unknown): string {
  if (typeof v === 'string' && /^[A-Za-z]{3}$/.test(v.trim())) return v.trim().toUpperCase();
  return 'USD';
}

/**
 * Parse an extracted date string and accept it only if it lands in a plausible
 * window (2000–2100). Returns the Date or null. Prevents `Timestamp.fromDate`
 * throwing on extreme years and keeps garbage dates out of anomaly baselines.
 */
export function parsePlausibleDate(iso: unknown): Date | null {
  if (typeof iso !== 'string' || iso.trim() === '') return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  if (year < 2000 || year > 2100) return null;
  return d;
}

/**
 * Validate a caller-supplied Storage path. Returns true only for a relative path
 * confined to the caller's own bill-upload prefix, blocking traversal/absolute
 * paths and cross-tenant reads of the default bucket (IDOR).
 */
export function isAllowedStoragePath(path: unknown, userId: string): boolean {
  if (typeof path !== 'string' || path === '') return false;
  if (path.includes('..') || path.startsWith('/') || path.includes('://')) return false;
  return path.startsWith(`bills/${userId}/`);
}
