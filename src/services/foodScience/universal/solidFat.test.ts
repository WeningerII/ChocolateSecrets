import { describe, test, expect } from 'vitest';
import { sfcAtTemp, blendSfcAtTemp } from './solidFat';

describe('solid fat content (SFC) vs temperature', () => {
  test('returns anchor points exactly', () => {
    expect(sfcAtTemp('cocoa_butter', 20)).toBe(82);
    expect(sfcAtTemp('cocoa_butter', 34)).toBe(5);
  });

  test('linearly interpolates between anchors', () => {
    // between (32, 24) and (34, 5): at 33 °C → 14.5
    expect(sfcAtTemp('cocoa_butter', 33)).toBeCloseTo(14.5, 6);
  });

  test('clamps below the first / above the last anchor', () => {
    expect(sfcAtTemp('cocoa_butter', -5)).toBe(100);
    expect(sfcAtTemp('cocoa_butter', 50)).toBe(0);
  });

  test('cocoa butter is far more solid than milk fat at 30 °C (sharper melt)', () => {
    expect(sfcAtTemp('cocoa_butter', 30)).toBeGreaterThan(sfcAtTemp('milk_fat', 30));
  });

  test('blend is mass-weighted', () => {
    // 0.7·82 + 0.3·22 = 64.0 at 20 °C
    expect(blendSfcAtTemp({ cocoa_butter: 0.7, milk_fat: 0.3 }, 20)).toBeCloseTo(64.0, 6);
  });

  test('empty blend → 0', () => {
    expect(blendSfcAtTemp({}, 20)).toBe(0);
  });
});
