import { describe, it, expect } from 'vitest';
import { normalizeVendorName, tokenize, jaccardSimilarity, nameMatchScore } from '../src/utils/billNormalization';

describe('billNormalization', () => {
  describe('normalizeVendorName', () => {
    it('strips corporate suffixes and normalizes', () => {
      expect(normalizeVendorName('ATMOS ENERGY CORP')).toBe('atmos energy');
      expect(normalizeVendorName('Atmos Energy Corp.')).toBe('atmos energy');
      expect(normalizeVendorName('ATMOS ENERGY, INC.')).toBe('atmos energy');
      expect(normalizeVendorName('The Atmos Energy Corporation')).toBe('atmos energy');
    });

    it('handles multiple spaces and punctuation', () => {
      expect(normalizeVendorName('Something   -  Else')).toBe('something else');
    });
  });

  describe('tokenize', () => {
    it('tokenizes correctly', () => {
      expect(tokenize('atmos energy')).toEqual(['atmos', 'energy']);
    });
  });

  describe('jaccardSimilarity', () => {
    it('calculates jaccard', () => {
      expect(jaccardSimilarity(['a', 'b'], ['a', 'b'])).toBe(1);
      expect(jaccardSimilarity(['a', 'b'], ['a', 'b', 'c'])).toBe(0.6666666666666666);
      expect(jaccardSimilarity([], [])).toBe(1);
      expect(jaccardSimilarity(['a'], [])).toBe(0);
    });
  });

  describe('nameMatchScore', () => {
    it('calculates score across real names', () => {
      expect(nameMatchScore('Atmos Engy', 'Atmos Energy Corp')).toBeCloseTo(0.333, 2); 
      // A (atmos engy) -> [atmos, engy] (2)
      // B (atmos energy corp) -> [atmos, energy] (2)
      // Union: atmos, engy, energy (3)
      // Intersection: atmos (1)
      // Score: 1/3 = 0.333
      
      expect(nameMatchScore('Atmos Energy', 'Atmos Energy')).toBe(1);
      expect(nameMatchScore('', '')).toBe(1);
      expect(nameMatchScore('Verizon Wireless', 'Verizon')).toBe(0.5);
    });
  });
});
