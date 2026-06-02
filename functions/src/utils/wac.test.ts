import { describe, it, expect } from 'vitest';
import { computeWAC } from './wac';

describe('computeWAC', () => {
  it('calculates WAC correctly for new stock', () => {
    // 10 units @ $2 + 5 units @ $5 = $20 + $25 = $45 / 15 = $3
    expect(computeWAC(10, 2, 5, 5)).toBe(3);
  });

  it('handles zero current stock', () => {
    expect(computeWAC(0, 0, 10, 5)).toBe(5);
  });

  it('handles zero received quantity', () => {
    expect(computeWAC(10, 2, 0, 5)).toBe(2);
  });

  it('handles negative new stock gracefully', () => {
    expect(computeWAC(10, 2, -15, 5)).toBe(2);
  });

  it('does not inject phantom cost when prior stock is negative (regression)', () => {
    // Over-consumption pushed stock to -5 before a delivery is booked. The 10 units
    // received at $8 are the only real inventory, so WAC must be $8 — not the $10
    // the old negative-weighted formula produced.
    expect(computeWAC(-5, 6, 10, 8)).toBe(8);
  });

  it('does not discard a receipt when stock crosses back through zero (regression)', () => {
    // Old behavior returned the stale $6 WAC (newStock 0 hit the `<= 0` guard),
    // silently throwing away the $80 of received cost. WAC must reflect the receipt.
    expect(computeWAC(-10, 6, 10, 8)).toBe(8);
  });

  it('weights only the received goods while stock is still net-negative', () => {
    // basis quantity clamps at 0, so 5 units @ $8 set WAC to $8 even though the
    // running stock total remains negative.
    expect(computeWAC(-10, 6, 5, 8)).toBe(8);
  });
});
