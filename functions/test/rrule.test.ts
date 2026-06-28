import { describe, it, expect } from 'vitest';
import { parseRRule, nextOccurrence } from '../src/utils/rrule';

describe('rrule utilities', () => {
  it('parses valid RRULEs without sets', () => {
    const rule = parseRRule('FREQ=MONTHLY;BYMONTHDAY=15');
    expect(rule.options.freq).toBe(1); // rrule.MONTHLY
  });

  it('throws on invalid RRULEs with friendly error', () => {
    expect(() => parseRRule('garbage')).toThrow(/Invalid RRULE:/);
  });

  it('nextOccurrence returns strictly future occurrence', () => {
    const now = new Date('2026-05-10T10:00:00Z');
    const next = nextOccurrence('FREQ=MONTHLY;BYMONTHDAY=15', now);
    expect(next).toBeTruthy();
    expect(next!.getUTCDate()).toBe(15);
    expect(next!.getTime()).toBeGreaterThan(now.getTime());
  });

  it('returns null if COUNT exceeded', () => {
    const now = new Date('2026-05-10T10:00:00Z');
    const next = nextOccurrence('FREQ=MONTHLY;BYMONTHDAY=15;COUNT=1;DTSTART=19990101T000000Z', now);
    expect(next).toBeNull();
  });
});
