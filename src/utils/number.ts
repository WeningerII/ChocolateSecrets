export interface ParsedNumber {
  /** Parsed value (0 when the input was blank or unparseable). */
  value: number;
  /**
   * Whether the input was a blank cell or a number we could confidently parse.
   * `false` means non-empty content that did not look like a number — the caller
   * should flag the row for review rather than silently importing 0.
   */
  ok: boolean;
}

/**
 * Locale-tolerant numeric parser for user-supplied strings (CSV cells, form input).
 *
 * `Number("1,50")`, `Number("$3.50")` and `Number("1.234,56")` all yield `NaN`,
 * which callers were silently coercing to 0 — corrupting costs/quantities for
 * users whose locale (es/ko) uses a comma decimal separator. This handles
 * currency symbols, thousands separators, and either decimal convention.
 *
 * Heuristics when a single separator is present: a trailing group of 1–2 digits
 * is treated as a decimal; a 3-digit trailing group (or multiple separators) is
 * treated as thousands grouping. When both separators appear, the right-most one
 * is the decimal separator.
 */
export function parseLocaleNumber(raw: unknown): ParsedNumber {
  if (raw === null || raw === undefined) return { value: 0, ok: false };
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? { value: raw, ok: true } : { value: 0, ok: false };
  }

  const trimmed = String(raw).trim();
  if (trimmed === '') return { value: 0, ok: true }; // blank cell = not provided

  // Accounting negatives: leading/trailing minus or parenthesized "(5)".
  const negative = /^-/.test(trimmed) || /-$/.test(trimmed) || /^\(.*\)$/.test(trimmed);

  // Strip everything except digits and separators (drops currency symbols/spaces).
  const cleaned = trimmed.replace(/[^0-9.,]/g, '');
  if (cleaned === '') return { value: 0, ok: false };

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  let normalized: string;
  if (lastComma > -1 && lastDot > -1) {
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandsSep = decimalSep === ',' ? '.' : ',';
    normalized = cleaned.split(thousandsSep).join('').replace(decimalSep, '.');
  } else {
    const sep = lastComma > -1 ? ',' : lastDot > -1 ? '.' : '';
    if (sep === '') {
      normalized = cleaned;
    } else {
      const parts = cleaned.split(sep);
      const trailing = parts[parts.length - 1];
      const isDecimal = parts.length === 2 && trailing.length >= 1 && trailing.length <= 2;
      normalized = isDecimal ? parts.join('.') : parts.join('');
    }
  }

  const magnitude = Number(normalized);
  if (!Number.isFinite(magnitude)) return { value: 0, ok: false };
  return { value: negative ? -magnitude : magnitude, ok: true };
}
