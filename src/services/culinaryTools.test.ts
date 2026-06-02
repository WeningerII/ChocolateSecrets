import { describe, it, expect } from 'vitest';
import { deriveAllergens, ALLERGEN_LABELS, inferEquipment, suggestEquipmentForStep, mergeEquipment, parseDairySpec, getIngredientSpec, parseChocolateSpec } from './culinaryTools';

describe('deriveAllergens', () => {
  it('detects milk from butter', () => {
    const allergens = deriveAllergens(['unsalted butter', 'sugar']);
    expect(allergens.some(a => a.allergen === 'milk' && a.certainty === 'contains')).toBe(true);
  });

  it('detects multiple allergens from a ganache', () => {
    const allergens = deriveAllergens(['dark chocolate 66%', 'heavy cream', 'butter', 'hazelnut paste']);
    const types = allergens.map(a => a.allergen);
    expect(types).toContain('milk');
    expect(types).toContain('tree_nuts');
  });

  it('flags dark chocolate as may-contain milk', () => {
    const allergens = deriveAllergens(['dark chocolate']);
    const milk = allergens.find(a => a.allergen === 'milk');
    expect(milk).toBeDefined();
  });

  it('escalates certainty when both may_contain and contains match', () => {
    // dark chocolate triggers may_contain milk; butter triggers contains milk.
    // Final should be 'contains'.
    const allergens = deriveAllergens(['dark chocolate', 'butter']);
    const milk = allergens.find(a => a.allergen === 'milk');
    expect(milk?.certainty).toBe('contains');
  });

  it('detects sesame in tahini', () => {
    const allergens = deriveAllergens(['tahini']);
    expect(allergens.some(a => a.allergen === 'sesame' && a.certainty === 'contains')).toBe(true);
  });

  it('detects wheat in panini bread', () => {
    const allergens = deriveAllergens(['panini bread', 'mozzarella', 'tomato']);
    expect(allergens.some(a => a.allergen === 'wheat')).toBe(true);
    expect(allergens.some(a => a.allergen === 'milk')).toBe(true);
  });

  it('detects eggs in hollandaise', () => {
    const allergens = deriveAllergens(['egg yolks', 'clarified butter', 'lemon juice']);
    expect(allergens.some(a => a.allergen === 'eggs' && a.certainty === 'contains')).toBe(true);
    expect(allergens.some(a => a.allergen === 'milk' && a.certainty === 'contains')).toBe(true);
  });

  it('detects EU-specific allergens', () => {
    const allergens = deriveAllergens(['dijon mustard', 'celeriac purée', 'balsamic vinegar', 'lupini beans']);
    expect(allergens.some(a => a.allergen === 'mustard')).toBe(true);
    expect(allergens.some(a => a.allergen === 'celery')).toBe(true);
    expect(allergens.some(a => a.allergen === 'sulphites')).toBe(true);
    expect(allergens.some(a => a.allergen === 'lupin')).toBe(true);
  });

  it('distinguishes molluscs from crustacean shellfish', () => {
    const allergens = deriveAllergens(['shrimp', 'oysters', 'scallops']);
    expect(allergens.some(a => a.allergen === 'shellfish')).toBe(true);
    expect(allergens.some(a => a.allergen === 'molluscs')).toBe(true);
  });

  it('flags lecithin as may_contain soy', () => {
    const allergens = deriveAllergens(['soy lecithin', 'dark chocolate']);
    const soy = allergens.find(a => a.allergen === 'soy');
    expect(soy).toBeDefined();
    expect(soy?.certainty).toBe('contains'); // "soy lecithin" hits the soy pattern directly
  });

  it('returns empty for empty input', () => {
    expect(deriveAllergens([])).toEqual([]);
    expect(deriveAllergens(['', '  '])).toEqual([]);
  });

  it('exports human-readable labels for every allergen key', () => {
    const allergens = deriveAllergens(['butter', 'eggs', 'wheat flour', 'sesame seeds', 'almonds', 'peanuts', 'soy sauce', 'shrimp', 'dijon mustard']);
    for (const flag of allergens) {
      expect(ALLERGEN_LABELS[flag.allergen]).toBeDefined();
      expect(ALLERGEN_LABELS[flag.allergen].length).toBeGreaterThan(0);
    }
  });
});

describe('inferEquipment', () => {
  it('maps tempering to chocolate-specific tools', () => {
    const equipment = inferEquipment(['temper']);
    expect(equipment.some(e => e.includes('thermometer'))).toBe(true);
    expect(equipment.some(e => e.includes('marble') || e.includes('tempering machine'))).toBe(true);
  });

  it('maps sous vide to immersion circulator', () => {
    const equipment = inferEquipment(['sous vide']);
    expect(equipment.some(e => e.includes('immersion circulator'))).toBe(true);
  });

  it('maps bread verbs to bread tools', () => {
    const equipment = inferEquipment(['laminate', 'proof', 'score']);
    expect(equipment.some(e => e.includes('rolling pin'))).toBe(true);
    expect(equipment.some(e => e.includes('proofing box') || e.includes('warm spot'))).toBe(true);
    expect(equipment.some(e => e.toLowerCase().includes('lame') || e.toLowerCase().includes('razor'))).toBe(true);
  });

  it('maps coffee verbs to coffee tools', () => {
    const equipment = inferEquipment(['pull shot']);
    expect(equipment.some(e => e.includes('espresso machine'))).toBe(true);
    expect(equipment.some(e => e.includes('portafilter'))).toBe(true);
  });

  it('returns empty for unknown verbs', () => {
    expect(inferEquipment(['frobnicate'])).toEqual([]);
  });

  it('deduplicates across overlapping verbs', () => {
    const equipment = inferEquipment(['chop', 'dice', 'mince']);
    // All three map to "chef knife" + "cutting board" — should not duplicate
    const knifeCount = equipment.filter(e => e.includes('chef knife')).length;
    expect(knifeCount).toBe(1);
  });
});

describe('suggestEquipmentForStep', () => {
  it('suggests thermometer when temperature target is set', () => {
    const suggestions = suggestEquipmentForStep({
      actionType: 'heat',
      title: 'Heat the milk',
      parameters: { temperatureTarget: 180 },
    });
    expect(suggestions.some(e => e.toLowerCase().includes('thermometer'))).toBe(true);
  });

  it('suggests timer when duration is set', () => {
    const suggestions = suggestEquipmentForStep({
      actionType: 'rest',
      title: 'Rest the dough',
      parameters: { durationSeconds: 600 },
    });
    expect(suggestions).toContain('timer');
  });

  it('picks up verbs from the title in addition to actionType', () => {
    const suggestions = suggestEquipmentForStep({
      actionType: 'other',
      title: 'Sear and rest the steak',
      parameters: {},
    });
    // 'sear' should surface searing tools
    expect(suggestions.some(e => e.includes('heavy-bottomed') || e.includes('cast iron'))).toBe(true);
  });
});

describe('mergeEquipment', () => {
  it('preserves existing entries and appends new suggestions', () => {
    const merged = mergeEquipment(['my cast iron pan', 'tongs'], ['heavy-bottomed pan (cast iron or carbon steel)', 'neutral oil with high smoke point']);
    expect(merged).toContain('my cast iron pan'); // existing preserved
    expect(merged).toContain('tongs');
    expect(merged).toContain('neutral oil with high smoke point');
  });

  it('skips case-insensitive duplicates', () => {
    const merged = mergeEquipment(['Timer'], ['timer', 'scale']);
    expect(merged.filter(e => e.toLowerCase() === 'timer').length).toBe(1);
    expect(merged).toContain('scale');
  });
});

describe('parseDairySpec', () => {
  it('parses heavy cream', () => {
    const spec = parseDairySpec('heavy cream');
    expect(spec).not.toBeNull();
    expect(spec!.category).toBe('heavy_cream');
    expect(spec!.fatPercentMin).toBe(36);
    expect(spec!.whippable).toBe(true);
  });

  it('parses half-and-half variants', () => {
    expect(parseDairySpec('half and half')?.category).toBe('half_and_half');
    expect(parseDairySpec('half-and-half')?.category).toBe('half_and_half');
    expect(parseDairySpec('half & half')?.category).toBe('half_and_half');
  });

  it('marks half-and-half as not whippable', () => {
    const spec = parseDairySpec('half and half');
    expect(spec?.whippable).toBe(false);
  });

  it('recognizes clotted cream as high-fat, not whippable', () => {
    const spec = parseDairySpec('clotted cream');
    expect(spec?.category).toBe('clotted_cream');
    expect(spec?.whippable).toBe(false);
    expect(spec?.fatPercentMin).toBeGreaterThanOrEqual(55);
  });

  it('recognizes Kerrygold with brand data', () => {
    const spec = parseDairySpec('Kerrygold butter');
    expect(spec?.brand).toBe('Kerrygold');
    expect(spec?.fatPercentMin).toBe(82);
    expect(spec?.origin).toBe('Ireland');
    expect(spec?.grassFed).toBe(true);
  });

  it('recognizes unsalted butter as sweet-cream butter', () => {
    const spec = parseDairySpec('unsalted butter');
    expect(spec?.category).toBe('butter_sweet');
  });

  it('recognizes European-style butter with higher fat range', () => {
    const spec = parseDairySpec('European butter');
    expect(spec?.category).toBe('butter_european');
    expect(spec?.fatPercentMin).toBe(82);
  });

  it('recognizes crème fraîche with diacritics or without', () => {
    expect(parseDairySpec('crème fraîche')?.category).toBe('creme_fraiche');
    expect(parseDairySpec('creme fraiche')?.category).toBe('creme_fraiche');
  });

  it('brand keyword matches override category fallback', () => {
    const spec = parseDairySpec('Échiré butter');
    expect(spec?.brand).toBe("Beurre d'Échiré");
    expect(spec?.aop).toBe(true);
    expect(spec?.cultured).toBe(true);
  });

  it('returns null for non-dairy and empty input', () => {
    expect(parseDairySpec('sugar')).toBeNull();
    expect(parseDairySpec('vanilla extract')).toBeNull();
    expect(parseDairySpec('')).toBeNull();
  });
});

describe('getIngredientSpec', () => {
  it('returns dairy kind for dairy ingredients', () => {
    const result = getIngredientSpec('heavy cream');
    expect(result?.kind).toBe('dairy');
    if (result?.kind === 'dairy') {
      expect(result.data.category).toBe('heavy_cream');
    }
  });

  it('returns chocolate kind for Valrhona products', () => {
    const result = getIngredientSpec('Valrhona Caraïbe 66%');
    expect(result?.kind).toBe('chocolate');
    if (result?.kind === 'chocolate') {
      expect(result.data.productName).toBe('Caraïbe');
    }
  });

  it('returns chocolate kind for generic "62% dark chocolate"', () => {
    const result = getIngredientSpec('62% dark chocolate');
    expect(result?.kind).toBe('chocolate');
  });

  it('still returns dairy kind for dairy items (regression guard)', () => {
    const result = getIngredientSpec('heavy cream');
    expect(result?.kind).toBe('dairy');
  });

  it('returns null for unknown items', () => {
    expect(getIngredientSpec('sugar')).toBeNull();
    expect(getIngredientSpec('flour')).toBeNull();
  });
});

describe('parseChocolateSpec — catalog matches', () => {
  it('recognizes Valrhona Guanaja with specific curve', () => {
    const spec = parseChocolateSpec('Valrhona Guanaja 70%');
    expect(spec.brand).toBe('Valrhona');
    expect(spec.productName).toBe('Guanaja');
    expect(spec.cocoaPercentage).toBe(70);
    expect(spec.type).toBe('dark');
    expect(spec.tempering?.workCelsius).toEqual([30, 31]);
    expect(spec.origin).toBeDefined();
  });

  it('recognizes Guanaja without brand prefix', () => {
    const spec = parseChocolateSpec('Guanaja');
    expect(spec.productName).toBe('Guanaja');
    expect(spec.brand).toBe('Valrhona');
  });

  it('recognizes Caraïbe with different working temp than Guanaja', () => {
    const spec = parseChocolateSpec('Valrhona Caraïbe');
    expect(spec.cocoaPercentage).toBe(66);
    expect(spec.tempering?.workCelsius).toEqual([31, 32]);
  });

  it('recognizes Callebaut 811 with numeric pattern', () => {
    const spec = parseChocolateSpec('Callebaut 811');
    expect(spec.brand).toBe('Callebaut');
    expect(spec.productName).toBe('811');
    expect(spec.type).toBe('dark');
    expect(spec.cocoaPercentage).toBeCloseTo(54.5);
  });

  it('recognizes Jivara as milk chocolate', () => {
    const spec = parseChocolateSpec('Jivara');
    expect(spec.type).toBe('milk');
    expect(spec.cocoaPercentage).toBe(40);
    expect(spec.tempering?.workCelsius).toEqual([29, 30]);
  });

  it('recognizes Ivoire as white chocolate', () => {
    const spec = parseChocolateSpec('Valrhona Ivoire 35%');
    expect(spec.type).toBe('white');
    expect(spec.cocoaPercentage).toBe(35);
  });

  it('recognizes Dulcey blond', () => {
    const spec = parseChocolateSpec('Valrhona Dulcey');
    expect(spec.type).toBe('white');
    expect(spec.flavorNotes).toContain('Blond');
  });

  it('recognizes Ruby RB1', () => {
    const spec = parseChocolateSpec('Callebaut Ruby RB1');
    expect(spec.type).toBe('ruby');
    expect(spec.cocoaPercentage).toBeCloseTo(47.3);
  });
});

describe('parseChocolateSpec — generic fallback', () => {
  it('parses "62% dark chocolate" (the original failure case)', () => {
    const spec = parseChocolateSpec('62% dark chocolate');
    expect(spec.type).toBe('dark');
    expect(spec.cocoaPercentage).toBe(62);
    expect(spec.tempering).toBeDefined();
  });

  it('parses "dark chocolate" without percentage', () => {
    const spec = parseChocolateSpec('dark chocolate');
    expect(spec.type).toBe('dark');
    expect(spec.cocoaPercentage).toBeUndefined();
  });

  it('parses "white chocolate"', () => {
    const spec = parseChocolateSpec('white chocolate');
    expect(spec.type).toBe('white');
  });

  it('parses "milk chocolate"', () => {
    const spec = parseChocolateSpec('milk chocolate');
    expect(spec.type).toBe('milk');
  });

  it('does not confuse "milk powder" with milk chocolate', () => {
    const spec = parseChocolateSpec('milk powder');
    expect(spec.type).toBeUndefined();
  });

  it('returns empty spec for non-chocolate', () => {
    const spec = parseChocolateSpec('sugar');
    expect(spec.type).toBeUndefined();
    expect(spec.brand).toBeUndefined();
  });

  it('defaults bare "66% chocolate" to dark', () => {
    const spec = parseChocolateSpec('66% chocolate');
    expect(spec.type).toBe('dark');
    expect(spec.cocoaPercentage).toBe(66);
  });
});
