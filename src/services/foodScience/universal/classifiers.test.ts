import { describe, test, expect } from 'vitest';
import { classifyAwBand, classifyFatRegime } from './classifiers';

describe('classifyAwBand', () => {
  test('boundary cases', () => {
    expect(classifyAwBand(0.95).key).toBe('very-fragile');
    expect(classifyAwBand(0.90).key).toBe('fragile');
    expect(classifyAwBand(0.80).key).toBe('stabilized');
    expect(classifyAwBand(0.75).key).toBe('shelf-stable');
    expect(classifyAwBand(0.60).key).toBe('functionally-stable');
  });
  test('every band returns an i18n key, never raw text', () => {
    for (const aw of [0.99, 0.90, 0.80, 0.75, 0.50]) {
      const band = classifyAwBand(aw);
      expect(band.labelKey).toMatch(/^chemistry:bands\.aw\./);
    }
  });
});

describe('classifyFatRegime', () => {
  test('boundary cases', () => {
    expect(classifyFatRegime(45).key).toBe('firm-set');
    expect(classifyFatRegime(30).key).toBe('standard');
    expect(classifyFatRegime(23).key).toBe('inversion-approaching');
    expect(classifyFatRegime(15).key).toBe('oil-in-water');
  });
});
