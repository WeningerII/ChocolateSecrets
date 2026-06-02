const UNIT_ALIASES: Record<string, string> = {
  'fl oz': 'fl_oz',
  'fluid ounce': 'fl_oz',
  'fluid ounces': 'fl_oz',
  'cups': 'cup',
  'lbs': 'lb',
  'pounds': 'lb',
  'pound': 'lb',
  'ounces': 'oz',
  'ounce': 'oz',
  'grams': 'g',
  'gram': 'g',
  'kilograms': 'kg',
  'kilogram': 'kg',
  'liters': 'l',
  'liter': 'l',
  'litres': 'l',
  'litre': 'l',
  'milliliters': 'ml',
  'milliliter': 'ml',
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'tablespoon': 'tbsp',
  'tablespoons': 'tbsp',
};

export function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] || lower;
}

const volumeToMl: Record<string, number> = {
  'ml': 1,
  'l': 1000,
  'tsp': 4.92892,
  'tbsp': 14.7868,
  'cup': 236.588,
  'fl_oz': 29.5735,
  'pt': 473.176,
  'qt': 946.353,
  'gal': 3785.41
};

const weightToG: Record<string, number> = {
  'g': 1,
  'kg': 1000,
  'oz': 28.3495,
  'lb': 453.592,
};

export function convertUnit(amount: number, fromUnit: string, toUnit: string, density?: number): number | null {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  
  if (from === to) return amount;
  
  // Volume to Volume
  if (volumeToMl[from] && volumeToMl[to]) {
    return amount * (volumeToMl[from] / volumeToMl[to]);
  }
  
  // Weight to Weight
  if (weightToG[from] && weightToG[to]) {
    return amount * (weightToG[from] / weightToG[to]);
  }
  
  // Volume to Weight (requires density: g/ml)
  if (density && volumeToMl[from] && weightToG[to]) {
    const ml = amount * volumeToMl[from];
    const g = ml * density;
    return g / weightToG[to];
  }

  // Weight to Volume (requires density: g/ml)
  if (density && weightToG[from] && volumeToMl[to]) {
    const g = amount * weightToG[from];
    const ml = g / density;
    return ml / volumeToMl[to];
  }

  return null; // Incompatible or unknown units
}
