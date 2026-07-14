/**
 * Pure validation & formatting helpers for the `sendShoppingList` callable.
 *
 * The server templates every outgoing email/SMS body from the validated items —
 * client free text never becomes a message verbatim. The only client prose that
 * survives is the optional `note`, flattened to a single plain-text line and
 * hard-capped at MAX_NOTE_LENGTH, rendered under an explicit "Note:" label.
 *
 * Kept free of firebase-functions / firebase-admin so the logic can be
 * unit-tested directly (mirrors utils/billValidation.ts).
 */

export const MAX_ITEMS = 200;
export const MAX_NAME_LENGTH = 200;
export const MAX_QUANTITY_LENGTH = 50;
export const MAX_UNIT_LENGTH = 50;
export const MAX_NOTE_LENGTH = 280;
/** Twilio rejects message bodies longer than 1600 characters. */
export const SMS_CHAR_LIMIT = 1600;

export interface ShoppingListItem {
  name: string;
  quantity?: string;
  unit?: string;
}

export type ShoppingListValidation =
  | { ok: true; items: ShoppingListItem[]; note: string | null }
  | { ok: false; error: string };

/**
 * Flatten client text to a single plain-text line: control characters and line
 * breaks collapse to spaces, so client input can never fabricate extra list
 * lines, headers, or labels inside the server-templated body.
 */
export function toPlainLine(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strictly validate the callable payload. Structural problems (wrong types,
 * over-length fields, too many items) are rejected with a descriptive error;
 * the free-text `note` is the one field that is capped rather than rejected.
 */
export function validateShoppingListInput(data: unknown): ShoppingListValidation {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: 'Request data must be an object with an `items` array.' };
  }
  const { items, note } = data as { items?: unknown; note?: unknown };

  if (!Array.isArray(items)) {
    return { ok: false, error: '`items` must be an array.' };
  }
  if (items.length === 0) {
    return { ok: false, error: '`items` must contain at least one item.' };
  }
  if (items.length > MAX_ITEMS) {
    return { ok: false, error: `\`items\` must contain at most ${MAX_ITEMS} items.` };
  }

  const cleaned: ShoppingListItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return { ok: false, error: `items[${i}] must be an object.` };
    }
    const { name, quantity, unit } = raw as { name?: unknown; quantity?: unknown; unit?: unknown };

    if (typeof name !== 'string') {
      return { ok: false, error: `items[${i}].name must be a string.` };
    }
    if (name.length > MAX_NAME_LENGTH) {
      return { ok: false, error: `items[${i}].name must be at most ${MAX_NAME_LENGTH} characters.` };
    }
    const cleanName = toPlainLine(name);
    if (cleanName === '') {
      return { ok: false, error: `items[${i}].name must not be empty.` };
    }

    const item: ShoppingListItem = { name: cleanName };

    if (quantity !== undefined && quantity !== null) {
      if (typeof quantity !== 'string') {
        return { ok: false, error: `items[${i}].quantity must be a string.` };
      }
      if (quantity.length > MAX_QUANTITY_LENGTH) {
        return { ok: false, error: `items[${i}].quantity must be at most ${MAX_QUANTITY_LENGTH} characters.` };
      }
      const cleanQuantity = toPlainLine(quantity);
      if (cleanQuantity !== '') item.quantity = cleanQuantity;
    }

    if (unit !== undefined && unit !== null) {
      if (typeof unit !== 'string') {
        return { ok: false, error: `items[${i}].unit must be a string.` };
      }
      if (unit.length > MAX_UNIT_LENGTH) {
        return { ok: false, error: `items[${i}].unit must be at most ${MAX_UNIT_LENGTH} characters.` };
      }
      const cleanUnit = toPlainLine(unit);
      if (cleanUnit !== '') item.unit = cleanUnit;
    }

    cleaned.push(item);
  }

  let cleanNote: string | null = null;
  if (note !== undefined && note !== null) {
    if (typeof note !== 'string') {
      return { ok: false, error: '`note` must be a string.' };
    }
    // Hard cap: truncate (not reject) so a chatty note never blocks the send.
    const flattened = toPlainLine(note).slice(0, MAX_NOTE_LENGTH).trim();
    cleanNote = flattened === '' ? null : flattened;
  }

  return { ok: true, items: cleaned, note: cleanNote };
}

/** `- Dark chocolate 70%: 2 kg` / `- Vanilla pods: 10` / `- Parchment paper` */
export function formatItemLine(item: ShoppingListItem): string {
  const amount = [item.quantity, item.unit].filter(Boolean).join(' ');
  return amount ? `- ${item.name}: ${amount}` : `- ${item.name}`;
}

function pluralize(count: number): string {
  return count === 1 ? 'item' : 'items';
}

export function formatEmailSubject(itemCount: number): string {
  return `Shopping List - Chocolate Secrets (${itemCount} ${pluralize(itemCount)})`;
}

export function formatEmailBody(items: ShoppingListItem[], note: string | null): string {
  const lines = [
    `Shopping list from Chocolate Secrets (${items.length} ${pluralize(items.length)}):`,
    '',
    ...items.map(formatItemLine),
  ];
  if (note) {
    lines.push('', `Note: ${note}`);
  }
  return lines.join('\n');
}

/**
 * SMS body constrained to `limit` characters (Twilio hard-fails above 1600).
 * When the full list does not fit, trailing items are dropped in favor of an
 * "…and N more items" line; the note (already capped) always survives.
 */
export function formatSmsBody(
  items: ShoppingListItem[],
  note: string | null,
  limit: number = SMS_CHAR_LIMIT
): string {
  const header = `Chocolate Secrets shopping list (${items.length} ${pluralize(items.length)}):`;
  const noteSuffix = note ? `\nNote: ${note}` : '';
  const lines = items.map(formatItemLine);

  for (let shown = items.length; shown >= 0; shown--) {
    const omitted = items.length - shown;
    const parts = [header, ...lines.slice(0, shown)];
    if (omitted > 0) {
      parts.push(`…and ${omitted} more ${pluralize(omitted)}`);
    }
    const body = parts.join('\n') + noteSuffix;
    if (body.length <= limit) return body;
  }

  // Unreachable with the real limit (header + truncation line + capped note is
  // far below 1600 chars) but guarantees the contract for arbitrary limits.
  return (header + noteSuffix).slice(0, limit);
}
