import { RRule, RRuleSet, rrulestr } from 'rrule';

/**
 * Validates an RRULE string. Returns the parsed rule or throws with a
 * caller-friendly error message.
 */
export function parseRRule(rruleStr: string): RRule {
  try {
    const rule = rrulestr(rruleStr);
    if (rule instanceof RRuleSet) {
      throw new Error('RRULE sets are not supported; provide a single RRULE');
    }
    return rule;
  } catch (err: any) {
    throw new Error(`Invalid RRULE: ${err.message}`);
  }
}

/**
 * Returns the next expected occurrence at or after `from`. If the rule has
 * a finite end and `from` is past it, returns null.
 */
export function nextOccurrence(rruleStr: string, from: Date): Date | null {
  const rule = parseRRule(rruleStr);
  const next = rule.after(from, true);
  return next || null;
}
