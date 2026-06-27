import { describe, test, expect, vi, afterEach } from 'vitest';
import { lookupUsdaSnapshot, lookupUsdaComposition, mapFdcNutrientsToComposition, USDA_FDC_SNAPSHOT, dehydrate } from './usdaFoodData';

describe('USDA_FDC_SNAPSHOT', () => {
  test('every entry has match keywords', () => {
    for (const entry of USDA_FDC_SNAPSHOT) {
      expect(entry.matchKeywords.length).toBeGreaterThan(0);
    }
  });

  test('every entry has at least one composition value', () => {
    for (const entry of USDA_FDC_SNAPSHOT) {
      const sum = Object.values(entry.composition).reduce((a, b) => a + (b ?? 0), 0);
      expect(sum).toBeGreaterThan(0);
    }
  });
});

describe('lookupUsdaSnapshot', () => {
  test('matches "Heavy Cream"', () => {
    const result = lookupUsdaSnapshot('Heavy Cream');
    expect(result?.description).toMatch(/heavy/i);
  });

  test('matches "raspberry puree"', () => {
    const result = lookupUsdaSnapshot('raspberry puree');
    expect(result?.description).toMatch(/raspberr/i);
  });

  test('matches "all-purpose flour"', () => {
    const result = lookupUsdaSnapshot('all-purpose flour');
    expect(result?.description).toMatch(/all-purpose/i);
  });

  test('returns null for nonsense input', () => {
    const result = lookupUsdaSnapshot('zzzzz qqqqq xxxxx');
    expect(result).toBeNull();
  });

  test('returns null for empty input', () => {
    expect(lookupUsdaSnapshot('')).toBeNull();
    expect(lookupUsdaSnapshot('   ')).toBeNull();
  });
});

describe('dehydrate', () => {
  // Whole cow milk per 100 g (FAO/SR Legacy). The snapshot already carries the
  // matching FDC powder ("Milk, dry, whole"), so this doubles as ground truth.
  const WHOLE_COW_MILK = { water: 88.0, fat: 3.3, protein: 3.2, lactose: 4.8, ash: 0.7 };

  test('reproduces the FDC whole-milk-powder composition from liquid cow milk', () => {
    const powder = dehydrate(WHOLE_COW_MILK);
    // FDC 170851 "Milk, dry, whole": fat 26.7, lactose 38.4, protein 26.3, ash 6.1
    expect(Math.abs((powder.fat ?? 0) - 26.7)).toBeLessThanOrEqual(0.6);
    expect(Math.abs((powder.lactose ?? 0) - 38.4)).toBeLessThanOrEqual(0.6);
    expect(Math.abs((powder.protein ?? 0) - 26.3)).toBeLessThanOrEqual(0.6);
    expect(Math.abs((powder.ash ?? 0) - 6.1)).toBeLessThanOrEqual(0.6);
  });

  test('concentrates to the target residual moisture and conserves ~100%', () => {
    const powder = dehydrate(WHOLE_COW_MILK, 3);
    expect(powder.water).toBe(3);
    const total = Object.values(powder).reduce((a, b) => a + (b ?? 0), 0);
    expect(Math.abs(total - 100)).toBeLessThanOrEqual(0.5);
  });

  test('preserves the ratios among solids', () => {
    const powder = dehydrate(WHOLE_COW_MILK);
    const liquidRatio = WHOLE_COW_MILK.fat / WHOLE_COW_MILK.protein;
    const powderRatio = (powder.fat ?? 0) / (powder.protein ?? 0);
    expect(Math.abs(liquidRatio - powderRatio)).toBeLessThan(0.05);
  });

  test('returns the input unchanged when there are no solids', () => {
    expect(dehydrate({ water: 100 })).toEqual({ water: 100 });
  });
});

describe('non-bovine milk snapshot entries', () => {
  test('resolves liquid camel milk to a mostly-water composition', () => {
    const r = lookupUsdaSnapshot('camel milk');
    expect(r?.description).toMatch(/camel/i);
    expect(r?.composition.water ?? 0).toBeGreaterThan(80);
  });

  test('resolves camel milk POWDER to the concentrated entry (not the liquid or cow)', () => {
    const r = lookupUsdaSnapshot('camel milk powder');
    expect(r?.description).toMatch(/camel/i);
    expect(r?.description).toMatch(/powder/i);
    expect(r?.composition.water ?? 100).toBeLessThan(10);
    expect(r?.composition.fat ?? 0).toBeGreaterThan(20);
  });

  test('resolves goat, sheep, water buffalo, and reindeer', () => {
    expect(lookupUsdaSnapshot('goat milk')?.description).toMatch(/goat/i);
    expect(lookupUsdaSnapshot('sheep milk powder')?.description).toMatch(/sheep/i);
    expect(lookupUsdaSnapshot('water buffalo milk')?.description).toMatch(/buffalo/i);
    expect(lookupUsdaSnapshot('reindeer milk powder')?.description).toMatch(/reindeer/i);
  });
});

describe('mapFdcNutrientsToComposition', () => {
  test('maps known FDC nutrient numbers to composition species (per 100 g, 1 dp)', () => {
    const comp = mapFdcNutrientsToComposition([
      { nutrientNumber: '255', value: 63.12 }, // water
      { nutrientNumber: '204', value: 30 },    // fat
      { nutrientNumber: '203', value: 2.84 },  // protein
      { nutrientNumber: '213', value: 3.2 },   // lactose
      { nutrientNumber: '999', value: 1 },     // unknown → ignored
    ]);
    expect(comp.water).toBe(63.1);
    expect(comp.fat).toBe(30);
    expect(comp.protein).toBe(2.8);
    expect(comp.lactose).toBe(3.2);
    expect(Object.keys(comp)).toEqual(['water', 'fat', 'protein', 'lactose']);
  });
});

describe('lookupUsdaComposition (live FDC with snapshot fallback)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test('falls back to the bundled snapshot when no API key is configured', async () => {
    const r = await lookupUsdaComposition('Heavy Cream');
    expect(r?.description).toMatch(/heavy/i);
  });

  test('queries the live FDC API when a key is set and maps nutrients to composition', async () => {
    vi.stubEnv('VITE_USDA_FDC_API_KEY', 'test-key');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        foods: [{
          fdcId: 12345, description: 'Butter, salted', dataType: 'SR Legacy',
          foodNutrients: [
            { nutrientNumber: '255', value: 16.2 },
            { nutrientNumber: '204', value: 81.1 },
          ],
        }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const r = await lookupUsdaComposition('butter');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(r?.fdcId).toBe(12345);
    expect(r?.composition.fat).toBe(81.1);
    expect(r?.composition.water).toBe(16.2);
  });

  test('falls back to the snapshot when the live call throws', async () => {
    vi.stubEnv('VITE_USDA_FDC_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const r = await lookupUsdaComposition('Heavy Cream');
    expect(r?.description).toMatch(/heavy/i);
  });
});
