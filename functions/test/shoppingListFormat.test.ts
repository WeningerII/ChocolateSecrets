import { describe, it, expect } from 'vitest';
import {
  validateShoppingListInput,
  formatItemLine,
  formatEmailSubject,
  formatEmailBody,
  formatSmsBody,
  toPlainLine,
  MAX_ITEMS,
  MAX_NAME_LENGTH,
  MAX_QUANTITY_LENGTH,
  MAX_UNIT_LENGTH,
  MAX_NOTE_LENGTH,
  SMS_CHAR_LIMIT,
} from '../src/utils/shoppingListFormat';

function expectRejected(data: unknown, errorMatch: RegExp | string) {
  const result = validateShoppingListInput(data);
  expect(result.ok).toBe(false);
  if (result.ok === false) expect(result.error).toMatch(errorMatch);
}

describe('toPlainLine', () => {
  it('collapses newlines, control chars, and runs of whitespace to single spaces', () => {
    expect(toPlainLine('a\nb\r\nc\td')).toBe('a b c d');
    expect(toPlainLine('  spaced   out  ')).toBe('spaced out');
    expect(toPlainLine('nul\u0000byte\u2028line\u0085sep end')).toBe('nul byte line sep end');
  });
});

describe('validateShoppingListInput', () => {
  it('accepts a well-formed payload and sanitizes fields', () => {
    const result = validateShoppingListInput({
      items: [
        { name: '  Dark chocolate 70% ', quantity: '2', unit: 'kg' },
        { name: 'Parchment paper' },
      ],
      note: '  Urgent — need it by Friday  ',
    });
    expect(result).toEqual({
      ok: true,
      items: [
        { name: 'Dark chocolate 70%', quantity: '2', unit: 'kg' },
        { name: 'Parchment paper' },
      ],
      note: 'Urgent — need it by Friday',
    });
  });

  it('returns note: null when the note is absent or blank', () => {
    const noNote = validateShoppingListInput({ items: [{ name: 'Cocoa' }] });
    expect(noNote).toMatchObject({ ok: true, note: null });
    const blankNote = validateShoppingListInput({ items: [{ name: 'Cocoa' }], note: '   ' });
    expect(blankNote).toMatchObject({ ok: true, note: null });
  });

  it('rejects payloads that are not objects with an items array', () => {
    expectRejected(undefined, /items/);
    expectRejected(null, /items/);
    expectRejected('items', /items/);
    expectRejected([], /items/);
    expectRejected({}, /`items` must be an array/);
    expectRejected({ items: 'nope' }, /`items` must be an array/);
  });

  it('rejects an empty list and a list above MAX_ITEMS', () => {
    expectRejected({ items: [] }, /at least one/);
    const tooMany = Array.from({ length: MAX_ITEMS + 1 }, () => ({ name: 'x' }));
    expectRejected({ items: tooMany }, /at most 200 items/);
    const justEnough = Array.from({ length: MAX_ITEMS }, () => ({ name: 'x' }));
    expect(validateShoppingListInput({ items: justEnough }).ok).toBe(true);
  });

  it('rejects malformed item entries', () => {
    expectRejected({ items: ['string'] }, /items\[0\] must be an object/);
    expectRejected({ items: [null] }, /items\[0\] must be an object/);
    expectRejected({ items: [{}] }, /items\[0\]\.name must be a string/);
    expectRejected({ items: [{ name: 42 }] }, /items\[0\]\.name must be a string/);
    expectRejected({ items: [{ name: '   ' }] }, /items\[0\]\.name must not be empty/);
  });

  it('rejects oversized names, quantities, and units (boundary-exact)', () => {
    expect(validateShoppingListInput({ items: [{ name: 'a'.repeat(MAX_NAME_LENGTH) }] }).ok).toBe(true);
    expectRejected(
      { items: [{ name: 'a'.repeat(MAX_NAME_LENGTH + 1) }] },
      /name must be at most 200 characters/
    );
    expectRejected(
      { items: [{ name: 'ok', quantity: 'q'.repeat(MAX_QUANTITY_LENGTH + 1) }] },
      /quantity must be at most 50 characters/
    );
    expectRejected(
      { items: [{ name: 'ok', unit: 'u'.repeat(MAX_UNIT_LENGTH + 1) }] },
      /unit must be at most 50 characters/
    );
  });

  it('rejects non-string quantity/unit (the old dev endpoint took numbers — the callable does not)', () => {
    expectRejected({ items: [{ name: 'ok', quantity: 2 }] }, /quantity must be a string/);
    expectRejected({ items: [{ name: 'ok', unit: ['kg'] }] }, /unit must be a string/);
  });

  it('drops quantity/unit that sanitize to empty instead of keeping blanks', () => {
    const result = validateShoppingListInput({ items: [{ name: 'ok', quantity: '  ', unit: '\n' }] });
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.items[0]).toEqual({ name: 'ok' });
  });

  it('rejects a non-string note but truncates an over-long one at MAX_NOTE_LENGTH', () => {
    expectRejected({ items: [{ name: 'ok' }], note: 42 }, /`note` must be a string/);
    const result = validateShoppingListInput({
      items: [{ name: 'ok' }],
      note: 'n'.repeat(MAX_NOTE_LENGTH + 100),
    });
    expect(result).toMatchObject({ ok: true, note: 'n'.repeat(MAX_NOTE_LENGTH) });
  });

  it('flattens note newlines so a note cannot fabricate extra list lines', () => {
    const result = validateShoppingListInput({
      items: [{ name: 'ok' }],
      note: 'first\n- fake item: 99 kg\nlast',
    });
    expect(result).toMatchObject({ ok: true, note: 'first - fake item: 99 kg last' });
  });
});

describe('formatItemLine', () => {
  it('formats name with quantity and unit', () => {
    expect(formatItemLine({ name: 'Cocoa butter', quantity: '2', unit: 'kg' })).toBe('- Cocoa butter: 2 kg');
  });
  it('formats name with quantity only and with unit only', () => {
    expect(formatItemLine({ name: 'Vanilla pods', quantity: '10' })).toBe('- Vanilla pods: 10');
    expect(formatItemLine({ name: 'Cream', unit: 'L' })).toBe('- Cream: L');
  });
  it('formats bare names without a trailing colon', () => {
    expect(formatItemLine({ name: 'Parchment paper' })).toBe('- Parchment paper');
  });
});

describe('formatEmailSubject / formatEmailBody', () => {
  it('puts the item count in the subject with correct pluralization', () => {
    expect(formatEmailSubject(1)).toBe('Shopping List - Chocolate Secrets (1 item)');
    expect(formatEmailSubject(3)).toBe('Shopping List - Chocolate Secrets (3 items)');
  });

  it('templates header, item lines, and a labeled note', () => {
    const body = formatEmailBody(
      [
        { name: 'Dark chocolate 70%', quantity: '2', unit: 'kg' },
        { name: 'Parchment paper' },
      ],
      'Need before Friday'
    );
    expect(body).toBe(
      'Shopping list from Chocolate Secrets (2 items):\n' +
        '\n' +
        '- Dark chocolate 70%: 2 kg\n' +
        '- Parchment paper\n' +
        '\n' +
        'Note: Need before Friday'
    );
  });

  it('omits the Note section when there is no note', () => {
    const body = formatEmailBody([{ name: 'Cocoa' }], null);
    expect(body).not.toContain('Note:');
  });
});

describe('formatSmsBody', () => {
  const longItems = Array.from({ length: 200 }, (_, i) => ({
    name: `Ingredient number ${i + 1} with a fairly long descriptive name`,
    quantity: '12',
    unit: 'kg',
  }));

  it('returns the full body untruncated when it fits', () => {
    const body = formatSmsBody([{ name: 'Cocoa', quantity: '1', unit: 'kg' }], 'hi');
    expect(body).toBe('Chocolate Secrets shopping list (1 item):\n- Cocoa: 1 kg\nNote: hi');
    expect(body.length).toBeLessThanOrEqual(SMS_CHAR_LIMIT);
  });

  it('truncates a long list under the Twilio limit with an "…and N more items" line', () => {
    const body = formatSmsBody(longItems, null);
    expect(body.length).toBeLessThanOrEqual(SMS_CHAR_LIMIT);
    expect(body).toMatch(/…and \d+ more items$/);
    expect(body).toContain('- Ingredient number 1 ');
    expect(body).not.toContain('Ingredient number 200');
  });

  it('keeps the capped note even when the item list is truncated', () => {
    const note = 'x'.repeat(MAX_NOTE_LENGTH);
    const body = formatSmsBody(longItems, note);
    expect(body.length).toBeLessThanOrEqual(SMS_CHAR_LIMIT);
    expect(body).toContain(`Note: ${note}`);
    expect(body).toMatch(/…and \d+ more items/);
  });

  it('does not truncate when the body fits the limit exactly', () => {
    const items = [
      { name: 'Cocoa', quantity: '1', unit: 'kg' },
      { name: 'Milk', quantity: '2', unit: 'L' },
    ];
    const full = formatSmsBody(items, null);
    expect(formatSmsBody(items, null, full.length)).toBe(full);
  });

  it('truncates with a singular "…and 1 more item" line one char below the exact fit', () => {
    // Names long enough that dropping one item frees more space than the
    // truncation line consumes, so exactly one item is omitted.
    const items = [{ name: 'A'.repeat(100) }, { name: 'B'.repeat(100) }];
    const full = formatSmsBody(items, null);
    const truncated = formatSmsBody(items, null, full.length - 1);
    expect(truncated.length).toBeLessThanOrEqual(full.length - 1);
    expect(truncated).toContain('…and 1 more item');
    expect(truncated).not.toContain('B'.repeat(100));
  });

  it('falls back to a hard slice when even the header cannot fit', () => {
    const body = formatSmsBody(longItems, null, 10);
    expect(body.length).toBeLessThanOrEqual(10);
  });
});
