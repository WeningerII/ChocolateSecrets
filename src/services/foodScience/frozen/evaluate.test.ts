import { describe, test, expect } from 'vitest';
import { evaluateFrozen } from './evaluate';
import type { Recipe, Ingredient } from '../../../types';
import type { ResolvedIngredient, AwResult } from '../universal';

describe('frozen evaluate end-to-end', () => {
  const catalog = new Map<string, Ingredient>();
  catalog.set('cream', { id: 'cream', name: 'Cream', stock: 0, lowStockThreshold: 0, category: 'Dairy' });
  catalog.set('milk', { id: 'milk', name: 'Whole Milk', stock: 0, lowStockThreshold: 0, category: 'Dairy' });
  catalog.set('sucrose', { id: 'sucrose', name: 'Sucrose', stock: 0, lowStockThreshold: 0 });
  catalog.set('dextrose', { id: 'dextrose', name: 'Dextrose', stock: 0, lowStockThreshold: 0 });
  catalog.set('nfdm', { id: 'nfdm', name: 'Milk Powder', stock: 0, lowStockThreshold: 0, category: 'Dairy' });
  catalog.set('lbg', { id: 'lbg', name: 'Locust Bean Gum', stock: 0, lowStockThreshold: 0 });
  catalog.set('vanilla', { id: 'vanilla', name: 'Vanilla Extract', stock: 0, lowStockThreshold: 0 });
  catalog.set('water', { id: 'water', name: 'Water', stock: 0, lowStockThreshold: 0 });
  catalog.set('puree', { id: 'puree', name: 'Raspberry Puree', stock: 0, lowStockThreshold: 0 });
  catalog.set('lemon', { id: 'lemon', name: 'Lemon Juice', stock: 0, lowStockThreshold: 0 });

  const dummyResolved = (id: string, mass: number, comp: any): ResolvedIngredient => ({
    ingredientId: id,
    name: id,
    mass,
    compositionSource: 'category_default',
    composition: comp,
  });

  test('Reference Italian gelato', () => {
    // Frisinghelli calibration for authentic gelato
    const resolved = [
      dummyResolved('milk', 610, { fat: 3.5, lactose: 4.8, protein: 3.2, ash: 0.7, water: 87.8 }),
      dummyResolved('cream', 130, { fat: 35, lactose: 3, protein: 2, water: 60 }),
      dummyResolved('nfdm', 45, { lactose: 52, protein: 36, ash: 8, water: 4 }),
      dummyResolved('sucrose', 180, { sucrose: 100 }),
      dummyResolved('dextrose', 30, { glucose: 90, water: 10 }), // Dextrose monohydrate
      dummyResolved('lbg', 5, {}),
    ];
    const totalMass = 1000;
    const waterMass = 610*0.878 + 130*0.6 + 45*0.04 + 50*0.1;
    const fatMass = 610*0.035 + 130*0.35;
    
    const rec: any = { name: 'Vanilla Gelato', categories: ['frozen'] };
    const res = evaluateFrozen({
      recipe: rec as Recipe,
      aw: { waterPct: (waterMass / totalMass) * 100, fatPct: (fatMass / totalMass) * 100 } as AwResult,
      resolved,
      ingredientCatalog: catalog,
    });

    const d = res.derived;
    // PAC ~ 30.2
    expect(d.composition.pac).toBeGreaterThanOrEqual(24);
    expect(d.composition.pac).toBeLessThanOrEqual(33);
    // MSNF in [9, 11]
    expect(d.composition.msnfPct).toBeGreaterThanOrEqual(9);
    expect(d.composition.msnfPct).toBeLessThanOrEqual(12);
    // TS ~ 38%
    expect(d.composition.totalSolidsPct).toBeGreaterThanOrEqual(36);
    expect(d.composition.totalSolidsPct).toBeLessThanOrEqual(41);
    
    expect(d.recipeSubtype).toBe('gelato');
    expect(res.warnings).toEqual([]); // Lands cleanly within bands without filtering
  });

  test('Reference sorbet', () => {
    const resolved = [
      dummyResolved('water', 300, { water: 100 }),
      dummyResolved('sucrose', 200, { sucrose: 100 }),
      dummyResolved('puree', 500, { water: 90, fructose: 5, glucose: 5 }),
    ];
    const totalMass = 1000;
    const waterMass = 300 + 500*0.9;
    
    const rec: any = { name: 'Raspberry Sorbet', categories: ['frozen'] };
    const res = evaluateFrozen({
      recipe: rec as Recipe,
      aw: { waterPct: (waterMass / totalMass) * 100, fatPct: 0 } as AwResult,
      resolved,
      ingredientCatalog: catalog,
    });

    const d = res.derived;
    expect(d.composition.msnfPct).toBe(0);
    expect(d.composition.fatPct).toBe(0);
    expect(d.recipeSubtype).toBe('sorbet');
    expect(res.warnings.find(w => w.kind === 'sorbet_dairy_present')).toBeUndefined();
  });

  test('Reference granita', () => {
    const resolved = [
      dummyResolved('water', 700, { water: 100 }),
      dummyResolved('sucrose', 200, { sucrose: 100 }),
      dummyResolved('lemon', 100, { water: 90, fructose: 2 }),
    ];
    const totalMass = 1000;
    const waterMass = 700 + 100*0.9;
    const ts = 100 - (waterMass / totalMass) * 100;
    
    const rec: any = { name: 'Lemon Granita', categories: ['frozen'] };
    const res = evaluateFrozen({
      recipe: rec as Recipe,
      aw: { waterPct: (waterMass / totalMass) * 100, fatPct: 0 } as AwResult,
      resolved,
      ingredientCatalog: catalog,
    });

    const d = res.derived;
    expect(d.recipeSubtype).toBe('granita');
    expect(d.composition.msnfPct).toBe(0);
  });

  test('Anti-pattern ice cream sandiness', () => {
    const resolved = [
      dummyResolved('cream', 250, { fat: 36, lactose: 3, protein: 2, water: 59 }),
      dummyResolved('milk', 400, { fat: 3.5, lactose: 4.8, protein: 3.2, ash: 0.7, water: 87.8 }),
      dummyResolved('sucrose', 150, { sucrose: 100 }),
      dummyResolved('nfdm', 200, { lactose: 52, protein: 36, ash: 8, water: 4 }), // way too much!
    ];
    // MSNF is going to be 200 * 0.96 / 1000 ~ 19% + milk ~ 22%.
    // Lactose alone from nfdm is 100g, which is > 11% of MSNF? Wait, lactose in MSNF is lactose / msnf.
    // Lactose = 100g. MSNF = 100g (nfdm lactose) + 72 (protein) + 16 (ash)...
    // Actually, lactose in MSNF = lactose / MSNF. NFDM is 52% lactose, 96% MSNF.
    // So 52/96 = 54% lactose in MSNF. This alone is > 11% sandiness threshold.
    const rec: any = { name: 'Ice cream', categories: ['frozen'] };
    const res = evaluateFrozen({
      recipe: rec as Recipe,
      aw: { waterPct: 50, fatPct: 15 } as AwResult,
      resolved,
      ingredientCatalog: catalog,
    });

    expect(res.warnings.find(w => w.kind === 'sandiness_risk')).toBeDefined();
  });

  test('Subtype declared overrides', () => {
    const rec: any = { name: 'Vanilla Frozen Treat', categories: ['frozen'], frozenSubtype: 'gelato' };
    const res = evaluateFrozen({
      recipe: rec as Recipe,
      aw: { waterPct: 50, fatPct: 15 } as AwResult,
      resolved: [],
      ingredientCatalog: catalog,
    });

    expect(res.derived.recipeSubtype).toBe('gelato');
    expect(res.derived.recipeSubtypeProvenance).toBe('declared');
  });
});
