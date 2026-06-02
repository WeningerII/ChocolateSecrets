import type { BreadRecipeSubtype } from '../../../types';
import type { BreadBand } from './types';

/**
 * Per-style bands. Sources: Hamelman, Bread 3e (2021); Forkish, Flour Water
 * Salt Yeast (2012); King Arthur Professional Reference; Reinhart, The Bread
 * Baker's Apprentice (2001).
 *
 * Yeast ranges are stated in instant-dry equivalent. Fresh yeast = 2.5x;
 * starter is unbounded and not in this table (sourdough warnings use a
 * different code path).
 */
export const BREAD_BANDS_BY_SUBTYPE: Record<BreadRecipeSubtype, BreadBand> = {
  standard_bread: {
    hydrationPctRange: [65, 75],
    saltPctRange: [1.8, 2.2],
    instantYeastPctRange: [0.4, 1.2],
    bulkFermentMinutesRange: [120, 240],
  },
  ciabatta: {
    hydrationPctRange: [75, 85],
    saltPctRange: [1.8, 2.2],
    instantYeastPctRange: [0.3, 0.8],
    bulkFermentMinutesRange: [180, 360],
  },
  baguette: {
    hydrationPctRange: [65, 72],
    saltPctRange: [1.8, 2.2],
    instantYeastPctRange: [0.3, 0.8],
    bulkFermentMinutesRange: [180, 240],
  },
  bagel: {
    hydrationPctRange: [50, 58],
    saltPctRange: [1.6, 2.0],
    instantYeastPctRange: [0.5, 1.0],
    bulkFermentMinutesRange: [60, 90],
  },
  pizza_dough: {
    hydrationPctRange: [60, 68],
    saltPctRange: [2.0, 3.0],
    instantYeastPctRange: [0.2, 0.6],
    bulkFermentMinutesRange: [240, 1440],   // can stretch to cold-fermented overnight
  },
  brioche: {
    hydrationPctRange: [50, 80],
    saltPctRange: [1.5, 2.0],
    instantYeastPctRange: [0.8, 1.5],
    bulkFermentMinutesRange: [60, 180],
  },
  whole_wheat: {
    hydrationPctRange: [70, 85],
    saltPctRange: [1.8, 2.2],
    instantYeastPctRange: [0.4, 1.0],
    wholeGrainFractionRange: [0.50, 1.00],
    bulkFermentMinutesRange: [120, 300],
  },
  sourdough: {
    hydrationPctRange: [70, 85],
    saltPctRange: [1.8, 2.2],
    instantYeastPctRange: [0.0, 0.0],         // sourdough doesn't use instant yeast typically
    bulkFermentMinutesRange: [240, 720],
  },
  pan_loaf: {
    hydrationPctRange: [60, 68],
    saltPctRange: [1.6, 2.0],
    instantYeastPctRange: [0.6, 1.2],
    bulkFermentMinutesRange: [60, 120],
  },
};

/**
 * Operational salt window across all styles. Below 1.4% the dough lacks flavor
 * and ferments too fast; above 2.4% yeast activity is materially suppressed
 * and the bread tastes salty. Subtype-specific bands narrow this further.
 */
export const SALT_PCT_OPERATIONAL_RANGE: [number, number] = [1.4, 2.4];

/**
 * Default DDT (Desired Dough Temperature) targets in °C.
 * - Lean doughs (standard, ciabatta, baguette, sourdough): 24°C
 * - Enriched doughs (brioche, pan loaf): 26°C
 * - Pizza dough: 24°C (cold ferment will follow)
 * - Bagel: 26°C (short ferment, denser dough benefits from slightly warmer)
 */
export const DEFAULT_DDT_BY_SUBTYPE: Record<BreadRecipeSubtype, number> = {
  standard_bread: 24,
  ciabatta:       24,
  baguette:       24,
  bagel:          26,
  pizza_dough:    24,
  brioche:        26,
  whole_wheat:    24,
  sourdough:      24,
  pan_loaf:       26,
};

/**
 * Estimated protein% by flour subtype. Used by gluten matrix scoring.
 * Real values vary by mill; these are operational midpoints.
 */
export const FLOUR_PROTEIN_PCT: Record<string, number> = {
  bread_flour:        12.5,    // ~12-13.5%
  whole_wheat_flour:  13.5,    // typically higher than white bread flour
  rye_flour:          9.0,     // significantly lower; rye gluten is structurally weak
  specialty_flour:    11.5,    // assume AP/00 territory
};

/**
 * Gluten matrix score thresholds. score = protein% × hydration% / 100.
 *   < 7.5         → weak (will not trap gas)
 *   7.5 – 9.5     → developing (standard)
 *   9.5 – 11.0    → strong (ciabatta / wet bread territory)
 *   > 11.0        → over-developed (likely to over-extend; structure may collapse)
 */
export const GLUTEN_BANDS: Array<{ max: number; band: 'weak' | 'developing' | 'strong' | 'over_developed' }> = [
  { max: 7.5,  band: 'weak' },
  { max: 9.5,  band: 'developing' },
  { max: 11.0, band: 'strong' },
  { max: Infinity, band: 'over_developed' },
];

/**
 * Safety bounds on calculated water temperature. Below 4°C the water is too
 * cold to dissolve yeast / mix evenly; above 60°C the water will kill yeast on
 * contact (commercial yeast death at ~55°C, sourdough yeast even lower).
 */
export const WATER_TEMP_SAFE_RANGE_C: [number, number] = [4, 60];
