import { describe, test, expect } from 'vitest';
import { QUALITY_DIMENSIONS } from './verifiability';
import * as universal from './universal';
import * as frozen from './frozen';
import * as confectionery from './confectionery';
import * as processLayer from './process';

describe('verifiability registry', () => {
  test('dimension ids are unique', () => {
    const ids = QUALITY_DIMENSIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('anything we compute is at least partly predictable (never the wall)', () => {
    for (const d of QUALITY_DIMENSIONS.filter((x) => x.computedBy !== null)) {
      expect(d.predictability).not.toBe('none');
    }
  });

  test('aroma and hedonic liking are encoded as the hard wall', () => {
    for (const id of ['aroma_character', 'hedonic_liking']) {
      const d = QUALITY_DIMENSIONS.find((x) => x.id === id);
      expect(d?.predictability).toBe('none');
      expect(d?.measurability).toBe('panel_only');
      expect(d?.computedBy).toBeNull();
    }
  });

  // Measurability and predictability are orthogonal (the subtle scope point):
  // some quantities are instrument-measurable yet NOT composition-predictable.
  test('"none" predictability can still be instrument-measurable (process-set)', () => {
    const ice = QUALITY_DIMENSIONS.find((x) => x.id === 'ice_crystal_size');
    expect(ice?.predictability).toBe('none'); // not derivable from a recipe
    expect(ice?.computedBy).toBeNull();
    expect(ice?.measurability).not.toBe('panel_only'); // but a microscope still reads it
  });

  // ...and conversely, a panel-only quantity can still be partly predictable.
  test('sweetness is panel-measured yet partly predictable (POD)', () => {
    const sweet = QUALITY_DIMENSIONS.find((x) => x.id === 'sweetness_intensity');
    expect(sweet?.measurability).toBe('panel_only');
    expect(sweet?.predictability).toBe('calibrated');
    expect(sweet?.computedBy).toBe('calculatePOD');
  });

  test('the new texture coordinate is registered first-principles', () => {
    const ice = QUALITY_DIMENSIONS.find((x) => x.id === 'ice_fraction_at_serving');
    expect(ice?.predictability).toBe('first_principles');
    expect(ice?.computedBy).toBe('computeFreezing');
  });
});

describe('verifiability registry ↔ kernel exports (anti-rot link check)', () => {
  // Collect every callable exported from the kernel barrels the registry points at,
  // so a renamed or removed kernel function can't silently leave the ledger dangling.
  const callableExports = new Set<string>();
  for (const ns of [universal, frozen, confectionery, processLayer]) {
    for (const [name, value] of Object.entries(ns)) {
      if (typeof value === 'function') callableExports.add(name);
    }
  }

  test('barrels actually loaded (guards against a false pass)', () => {
    expect(callableExports.size).toBeGreaterThan(10);
  });

  test('every computedBy symbol resolves to a real exported kernel function', () => {
    const linked = QUALITY_DIMENSIONS.filter((d) => d.computedBy !== null);
    expect(linked.length).toBeGreaterThan(5);
    const dangling = linked
      .filter((d) => !callableExports.has(d.computedBy as string))
      .map((d) => `${d.id} → ${d.computedBy}`);
    expect(dangling).toEqual([]);
  });
});
