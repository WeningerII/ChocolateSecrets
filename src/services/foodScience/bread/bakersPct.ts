import type { Ingredient } from '../../../types';
import type { ResolvedIngredient } from '../universal';
import type { BreadComposition, BakersIngredientLine } from './types';

const N = (i: Ingredient) => (i.name ?? '').toLowerCase();

/** True if this ingredient contributes to total flour mass. */
function isFlour(r: ResolvedIngredient, ing: Ingredient | undefined): boolean {
  if (r.role === 'flour_starch' && ing && /flour|harina|farinha|semolina/.test(N(ing))) return true;
  if (ing && /\b(bread flour|all-purpose flour|whole wheat flour|rye flour|spelt flour|einkorn|durum|semolina)\b/.test(N(ing))) return true;
  return false;
}

/** Detect flour subtype from the ingredient name. */
function flourSubtype(ing: Ingredient): BakersIngredientLine['flourSubtype'] {
  const n = N(ing);
  if (/whole wheat|wholewheat|whole-grain|atta/.test(n)) return 'whole_wheat_flour';
  if (/\brye\b|centeno/.test(n)) return 'rye_flour';
  if (/bread flour/.test(n)) return 'bread_flour';
  return 'specialty_flour';
}

/** True for explicit added water (not water that lives inside another ingredient). */
function isWater(r: ResolvedIngredient, ing: Ingredient | undefined): boolean {
  if (r.role === 'water') return true;
  if (ing && /^(water|distilled water|filtered water|agua)$/.test(N(ing))) return true;
  return false;
}

function isSalt(r: ResolvedIngredient): boolean {
  return r.role === 'salt';
}

/** Yeast forms — fresh, instant dry, starter (sourdough levain). */
function yeastForm(r: ResolvedIngredient, ing: Ingredient | undefined): 'fresh' | 'instant_dry' | 'starter' | null {
  if (r.role !== 'leavener') return null;
  if (!ing) return null;
  const n = N(ing);
  if (/sourdough starter|levain|biga|poolish|natural leaven|madre/.test(n)) return 'starter';
  if (/fresh yeast|cake yeast|compressed yeast|levadura fresca/.test(n)) return 'fresh';
  if (/instant.*yeast|active dry yeast|sa[lf]\s?instant|levadura instantanea|levadura seca/.test(n)) return 'instant_dry';
  // Default for unspecified yeast — assume instant dry (most common in modern home & artisan baking)
  if (/yeast|levadura/.test(n)) return 'instant_dry';
  return null;
}

/**
 * Aggregate baker's-percentage view of the recipe. Returns null when no flour
 * is present — the caller treats that as a `no_flour_present` warning.
 */
export function calculateBakersPct(
  resolved: ResolvedIngredient[],
  catalog: Map<string, Ingredient>,
  starterHydrationPct: number = 100
): BreadComposition | null {
  // First pass — calculate starter mass and breakdown
  let starterMassRaw = 0;
  for (const r of resolved) {
    const ing = catalog.get(r.ingredientId);
    if ((yeastForm(r, ing) === 'starter') || (ing && /sourdough starter|levain|biga|poolish|natural leaven|madre/.test(N(ing)))) {
      starterMassRaw += r.mass;
    }
  }
  
  // Hydration math: if hydration is 100%, starter is 50% flour, 50% water
  // fraction = hydrationPct / 100
  // starterFlour = starterMass / (1 + fraction)
  // starterWater = starterMass - starterFlour
  const fraction = starterHydrationPct / 100;
  const totalStarterFlour = starterMassRaw / (1 + fraction);
  const totalStarterWater = starterMassRaw - totalStarterFlour;

  // Second pass — total flour mass
  let totalFlourMass = totalStarterFlour;
  for (const r of resolved) {
    const ing = catalog.get(r.ingredientId);
    if (isFlour(r, ing)) totalFlourMass += r.mass;
  }
  if (totalFlourMass <= 0) return null;

  const lines: BakersIngredientLine[] = [];
  let waterFromIngredients = totalStarterWater;
  let saltMass = 0;
  let freshYeastMass = 0, instantYeastMass = 0, starterMass = starterMassRaw;
  let fatMass = 0, sweetenerMass = 0;
  let wholeGrainMass = 0;

  for (const r of resolved) {
    const ing = catalog.get(r.ingredientId);
    const flourFlag = isFlour(r, ing);
    const waterFlag = isWater(r, ing);
    const saltFlag = isSalt(r);
    const yeast = ing ? yeastForm(r, ing) : null;
    const isStarter = (yeast === 'starter' || (ing && /sourdough starter|levain|biga|poolish|natural leaven|madre/.test(N(ing))));

    let role: BakersIngredientLine['role'] = 'other';
    let subtype: BakersIngredientLine['flourSubtype'] | undefined;

    if (flourFlag && ing) {
      role = 'flour';
      subtype = flourSubtype(ing);
      if (subtype === 'whole_wheat_flour' || subtype === 'rye_flour') wholeGrainMass += r.mass;
    } else if (waterFlag) {
      role = 'water';
      waterFromIngredients += r.mass;
      // Account for water inside the ingredient as a partial credit
    } else if (saltFlag) {
      role = 'salt';
      saltMass += r.mass;
    } else if (yeast === 'fresh') {
      role = 'yeast'; freshYeastMass += r.mass;
    } else if (yeast === 'instant_dry') {
      role = 'yeast'; instantYeastMass += r.mass;
    } else if (isStarter) {
      role = 'yeast'; // Starter is handled outside this loop
    } else if (r.role === 'leavener') {
      role = 'leavener_other';      // baking soda / baking powder in non-yeasted breads
    } else if (r.role === 'fat') {
      role = 'fat'; fatMass += r.mass;
    } else if (r.role === 'sweetener') {
      role = 'sweetener'; sweetenerMass += r.mass;
    } else if (r.role === 'protein') {
      role = 'protein';
      // Eggs and milk contribute water too — pick up their composition.water below
    } else if (r.role === 'inclusion') {
      role = 'inclusion';
    }

    // Water lurking inside other ingredients (egg ~75% water, milk ~88%, butter ~16%)
    // adds to effective hydration. For brioche/pan loaf, this is significant.
    if (!flourFlag && !waterFlag && !isStarter && r.composition.water) {
      const lurkingWater = (r.composition.water / 100) * r.mass;
      waterFromIngredients += lurkingWater;
    }

    lines.push({
      ingredientId: r.ingredientId,
      name: r.name,
      mass: r.mass,
      pct: (r.mass / totalFlourMass) * 100,
      role,
      flourSubtype: subtype,
    });
  }

  const hydrationPct = (waterFromIngredients / totalFlourMass) * 100;
  const saltPct = (saltMass / totalFlourMass) * 100;
  const freshYeastPct = (freshYeastMass / totalFlourMass) * 100;
  const instantYeastPct = (instantYeastMass / totalFlourMass) * 100;
  const starterPct = (starterMass / totalFlourMass) * 100;
  const fatPct = (fatMass / totalFlourMass) * 100;
  const sweetenerPct = (sweetenerMass / totalFlourMass) * 100;

  // Instant-dry equivalent: instant_dry counts 1×, fresh counts 0.4× (1/2.5),
  // starter is excluded (it's a different leavening mechanism).
  const instantYeastEquivalentPct = instantYeastPct + freshYeastPct * 0.4;

  return {
    totalFlourMass,
    hydrationPct,
    saltPct,
    instantYeastEquivalentPct,
    freshYeastPct,
    instantYeastPct,
    starterPct,
    fatPct,
    sweetenerPct,
    wholeGrainFraction: wholeGrainMass / totalFlourMass,
    lines,
  };
}
