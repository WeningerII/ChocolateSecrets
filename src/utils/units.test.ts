import { describe, it, expect, test } from 'vitest';
import { convertUnit, normalizeUnit } from './units';

describe('normalizeUnit', () => {
  test('canonicalizes fl oz to fl_oz', () => {
    expect(normalizeUnit('fl oz')).toBe('fl_oz');
    expect(normalizeUnit('FL OZ')).toBe('fl_oz');
    expect(normalizeUnit('fluid ounce')).toBe('fl_oz');
    expect(normalizeUnit('fluid ounces')).toBe('fl_oz');
  });
  
  test('canonicalizes common aliases', () => {
    expect(normalizeUnit('lbs')).toBe('lb');
    expect(normalizeUnit('pounds')).toBe('lb');
    expect(normalizeUnit('cups')).toBe('cup');
    expect(normalizeUnit('grams')).toBe('g');
  });
  
  test('returns lowercase canonical for already-canonical input', () => {
    expect(normalizeUnit('g')).toBe('g');
    expect(normalizeUnit('fl_oz')).toBe('fl_oz');
  });
  
  test('returns unknown units as-is', () => {
    expect(normalizeUnit('pinches')).toBe('pinches');  // no alias defined
  });
});

describe('convertUnit', () => {
  it('converts volume to volume correctly', () => {
    expect(convertUnit(1, 'l', 'ml')).toBe(1000);
    expect(convertUnit(1, 'gal', 'l')).toBeCloseTo(3.785, 3);
    expect(convertUnit(1, 'cup', 'ml')).toBeCloseTo(236.588, 3);
  });

  it('converts weight to weight correctly', () => {
    expect(convertUnit(1, 'kg', 'g')).toBe(1000);
    expect(convertUnit(1, 'lb', 'g')).toBeCloseTo(453.592, 3);
    expect(convertUnit(1, 'oz', 'g')).toBeCloseTo(28.3495, 3);
  });

  it('handles same unit conversion', () => {
    expect(convertUnit(10, 'g', 'g')).toBe(10);
    expect(convertUnit(5, 'ml', 'ml')).toBe(5);
  });

  it('returns null for incompatible units without density', () => {
    expect(convertUnit(1, 'ml', 'g')).toBeNull();
    expect(convertUnit(1, 'g', 'ml')).toBeNull();
  });

  it('converts volume to weight with density', () => {
    // density = 1.2 g/ml
    expect(convertUnit(100, 'ml', 'g', 1.2)).toBe(120);
    expect(convertUnit(1, 'l', 'kg', 1.2)).toBe(1.2);
  });

  it('converts weight to volume with density', () => {
    // density = 1.2 g/ml
    expect(convertUnit(120, 'g', 'ml', 1.2)).toBe(100);
    expect(convertUnit(1.2, 'kg', 'l', 1.2)).toBe(1);
  });

  describe('convertUnit with fl_oz', () => {
    test('converts fl_oz to ml', () => {
      expect(convertUnit(1, 'fl_oz', 'ml')).toBeCloseTo(29.5735, 3);
    });
    
    test('converts "fl oz" (space) to ml via alias', () => {
      expect(convertUnit(1, 'fl oz', 'ml')).toBeCloseTo(29.5735, 3);
    });
    
    test('converts cups to fl_oz', () => {
      expect(convertUnit(1, 'cup', 'fl_oz')).toBeCloseTo(8, 2);  // 1 cup = 8 fl oz
    });
  });

  it('handles unknown units', () => {
    expect(convertUnit(1, 'unknown', 'g')).toBeNull();
    expect(convertUnit(1, 'g', 'unknown')).toBeNull();
  });

  it('is case insensitive and trims whitespace', () => {
    expect(convertUnit(1, ' KG ', ' g ')).toBe(1000);
    expect(convertUnit(1, 'Ml', 'L')).toBe(0.001);
  });
});
