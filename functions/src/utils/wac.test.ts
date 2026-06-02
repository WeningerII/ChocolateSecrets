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
});
