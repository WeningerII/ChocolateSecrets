import { describe, it, expect } from 'vitest';
import { calculateDdtWaterTemp } from '../ddt';
import { assessGluten } from '../gluten';
import type { BakersIngredientLine } from '../types';
import { evaluateBread } from '../evaluate';
import type { Recipe, Ingredient } from '../../../../types';
import type { ResolvedIngredient } from '../../universal';

describe('Bread Module Unit Tests', () => {
  describe('DDT Calculation', () => {
    it('calculates 3-factor water temperature correctly', () => {
      // Formula: Water = DDT*3 - Room - Flour - Friction
      // Target: 24, Room: 22, Flour: 22, Friction: 10 (stand mixer)
      // Water = 24*3 - 22 - 22 - 10 = 72 - 54 = 18
      const res = calculateDdtWaterTemp({
        desiredDoughTempC: 24,
        roomTempC: 22,
        flourTempC: 22,
        frictionFactorC: 10,
      });
      expect(res.formula).toBe('3-factor');
      expect(res.waterTempC).toBe(18);
    });

    it('calculates 4-factor water temperature correctly with preferment', () => {
      // Formula: Water = DDT*4 - Room - Flour - Preferment - Friction
      // Target: 24, Room: 22, Flour: 22, Pref: 22, Friction: 10
      // Water = 24*4 - 22 - 22 - 22 - 10 = 96 - 76 = 20
      const res = calculateDdtWaterTemp({
        desiredDoughTempC: 24,
        roomTempC: 22,
        flourTempC: 22,
        prefermentTempC: 22,
        frictionFactorC: 10,
      });
      expect(res.formula).toBe('4-factor');
      expect(res.waterTempC).toBe(20);
    });
  });

  describe('Gluten Matrix Scoring', () => {
    it('assesses standard bread flour correctly', () => {
      // Bread flour (12.5% protein) at 70% hydration
      // Score = 12.5 * 70 / 100 = 8.75 -> developing (7.5 to 9.5)
      const lines: BakersIngredientLine[] = [
        { ingredientId: '1', name: 'Bread Flour', mass: 1000, pct: 100, role: 'flour', flourSubtype: 'bread_flour' },
      ];
      const res = assessGluten(lines, 70);
      expect(res.estimatedProteinPct).toBeCloseTo(12.5);
      expect(res.rawScore).toBeCloseTo(8.75);
      expect(res.band).toBe('developing');
    });

    it('assesses whole wheat / high hydration correctly', () => {
      // Whole wheat (13.5) + Bread (12.5) at 50/50 = 13.0
      // Hydration 80%
      // Score = 13.0 * 80 / 100 = 10.4 -> strong (9.5 to 11.0)
      const lines: BakersIngredientLine[] = [
        { ingredientId: '1', name: 'WW', mass: 500, pct: 50, role: 'flour', flourSubtype: 'whole_wheat_flour' },
        { ingredientId: '2', name: 'BF', mass: 500, pct: 50, role: 'flour', flourSubtype: 'bread_flour' },
      ];
      const res = assessGluten(lines, 80);
      expect(res.estimatedProteinPct).toBe(13.0);
      expect(res.rawScore).toBe(10.4);
      expect(res.band).toBe('strong');
    });
    
    it('flags weak gluten when protein / hydration are low', () => {
      // Rye flour (9.0%) at 60% hydration
      // Score = 9.0 * 60 / 100 = 5.4 -> weak (< 7.5)
      const lines: BakersIngredientLine[] = [
        { ingredientId: '1', name: 'Rye', mass: 1000, pct: 100, role: 'flour', flourSubtype: 'rye_flour' },
      ];
      const res = assessGluten(lines, 60);
      expect(res.band).toBe('weak');
    });
  });

  describe('Bread E2E Evaluation', () => {
    const catalog = new Map<string, Ingredient>();
    catalog.set('flour', { id: 'flour', name: 'Bread Flour', stock: 0, lowStockThreshold: 0 });
    catalog.set('water', { id: 'water', name: 'Water', stock: 0, lowStockThreshold: 0 });
    catalog.set('salt', { id: 'salt', name: 'Salt', stock: 0, lowStockThreshold: 0 });
    catalog.set('yeast', { id: 'yeast', name: 'Instant Yeast', stock: 0, lowStockThreshold: 0 });
    catalog.set('starter', { id: 'starter', name: 'Sourdough Starter', stock: 0, lowStockThreshold: 0 });
    catalog.set('butter', { id: 'butter', name: 'Butter', stock: 0, lowStockThreshold: 0 });
    catalog.set('egg', { id: 'egg', name: 'Egg', stock: 0, lowStockThreshold: 0 });
    catalog.set('sugar', { id: 'sugar', name: 'Sugar', stock: 0, lowStockThreshold: 0 });

    const dummyResolved = (id: string, mass: number, role: string, comp: any = {}): ResolvedIngredient => ({
      ingredientId: id, name: id, mass, role: role as any, compositionSource: 'explicit', composition: comp
    });

    it('Country bread', () => {
      const resolved = [
        dummyResolved('flour', 1000, 'flour_starch'),
        dummyResolved('water', 700, 'water', { water: 100 }),
        dummyResolved('salt', 20, 'salt'),
        dummyResolved('yeast', 10, 'leavener'),
      ];
      const res = evaluateBread({
        recipe: { name: 'Country Bread', categories: ['bread'] } as any,
        resolved,
        ingredientCatalog: catalog,
      });
      expect(res).toBeDefined();
      expect(res!.derived.recipeSubtype).toBe('standard_bread');
      expect(res!.derived.composition.hydrationPct).toBeCloseTo(70);
      expect(res!.derived.composition.saltPct).toBeCloseTo(2.0);
    });

    it('Ciabatta', () => {
      const resolved = [
        dummyResolved('flour', 1000, 'flour_starch'),
        dummyResolved('water', 820, 'water', { water: 100 }),
        dummyResolved('salt', 20, 'salt'),
        dummyResolved('yeast', 5, 'leavener'),
      ];
      const res = evaluateBread({
        recipe: { name: 'Ciabatta', categories: ['bread'] } as any,
        resolved,
        ingredientCatalog: catalog,
      });
      expect(res!.derived.recipeSubtype).toBe('ciabatta');
      expect(res!.warnings).toEqual([]); // Lands cleanly inside hydration band
    });

    it('Bagel (with specific handling for the gluten_weak warning)', () => {
      const resolved = [
        dummyResolved('flour', 1000, 'flour_starch'),
        dummyResolved('water', 550, 'water', { water: 100 }), // 55%
        dummyResolved('salt', 18, 'salt'),
        dummyResolved('yeast', 8, 'leavener'),
      ];
      const res = evaluateBread({
        recipe: { name: 'Bagel', categories: ['bread'] } as any,
        resolved,
        ingredientCatalog: catalog,
      });
      expect(res!.derived.recipeSubtype).toBe('bagel');
      // It might trigger a gluten_weak warning because hydration is low and defaults to AP flour. That is handled/okay.
      expect(res!.warnings.map(w => w.kind)).toContain('gluten_weak');
    });

    it('Sourdough (with correct starter accounting)', () => {
      const resolved = [
        dummyResolved('flour', 900, 'flour_starch'),
        dummyResolved('water', 650, 'water', { water: 100 }),
        dummyResolved('salt', 20, 'salt'),
        dummyResolved('starter', 200, 'leavener'), // 100g flour, 100g water (assuming 100% hydration)
      ];
      const res = evaluateBread({
        recipe: { 
          name: 'Sourdough', categories: ['bread'], 
          mixingParams: { starterHydrationPct: 100 }
        } as any,
        resolved,
        ingredientCatalog: catalog,
      });
      expect(res!.derived.recipeSubtype).toBe('sourdough');
      const comp = res!.derived.composition;
      expect(comp.totalFlourMass).toBe(1000); // 900 + 100
      expect(comp.hydrationPct).toBeCloseTo(75); // (650 + 100) / 1000 = 75%
      expect(res!.warnings).toEqual([]);
    });

    it('A recipe named Sourdough without a starter ingredient', () => {
      const resolved = [
        dummyResolved('flour', 1000, 'flour_starch'),
        dummyResolved('water', 750, 'water', { water: 100 }),
        dummyResolved('salt', 20, 'salt'),
        dummyResolved('yeast', 10, 'leavener'), // Commercial yeast instead
      ];
      const res = evaluateBread({
        recipe: { name: 'Sourdough', categories: ['bread'] } as any,
        resolved,
        ingredientCatalog: catalog,
      });
      expect(res!.derived.recipeSubtype).toBe('sourdough');
      expect(res!.warnings.map(w => w.kind)).toContain('sourdough_no_starter');
    });

    it('Brioche calibration', () => {
      const resolved = [
        dummyResolved('flour', 1000, 'flour_starch'),
        dummyResolved('water', 100, 'liquid', { water: 100 }), 
        dummyResolved('egg', 500, 'liquid', { water: 75 }), // 375g water
        dummyResolved('butter', 500, 'fat', { water: 16 }), // 80g water
        dummyResolved('sugar', 200, 'sweetener'),
        dummyResolved('salt', 20, 'salt'),
        dummyResolved('yeast', 15, 'leavener'),
      ];
      const res = evaluateBread({
        recipe: { name: 'Brioche', categories: ['bread'] } as any,
        resolved,
        ingredientCatalog: catalog,
      });
      expect(res!.derived.recipeSubtype).toBe('brioche');
      const comp = res!.derived.composition;
      // waterFromIngredients = 100 + 375 + 80 = 555. hydration = 55.5% 
      // wait, hydration of brioche = ? let's check
      expect(comp.hydrationPct).toBeCloseTo(55.5);
    });
  });
});
