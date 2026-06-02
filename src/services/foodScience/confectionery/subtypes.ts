import type { Ingredient, ConfectionerySubtype, UniversalRole } from '../../../types';
import { CONFECTIONERY_ROLE_SUBTYPE_MAP } from './types';

const N = (i: Ingredient) => (i.name ?? '').toLowerCase();

/**
 * Infer a confectionery subtype for an ingredient, given its already-known
 * universal role. Returns null if no confident subtype can be assigned.
 *
 * Heuristics layered on top of the role→subtype default. First matching
 * heuristic wins.
 */
export function inferConfectionerySubtype(
  ingredient: Ingredient,
  universal: UniversalRole | undefined
): ConfectionerySubtype | null {
  const n = N(ingredient);

  // Chocolate is identified by spec, not role
  if (ingredient.chocolateSpec) return 'chocolate';

  // Cocoa butter is its own subtype regardless of role
  if (/cocoa butter/.test(n)) return 'cocoa_butter';

  // Praline / gianduja / nougat pastes
  if (/praline paste|gianduja paste|nougat paste|frangipane/.test(n)) return 'praline_paste';

  // Fondant
  if (/\bfondant\b/.test(n)) return 'fondant';

  // Glucose / corn syrup
  if (/glucose syrup|corn syrup|jarabe de glucosa/.test(n)) return 'glucose_syrup';

  // Milk powder family
  if (/milk powder|nonfat dry|nfdm|powdered milk|skim milk powder|whole milk powder/.test(n)) {
    return 'milk_powder';
  }

  // Gelatin specifically (vs other hydrocolloids)
  if (/\bgelatin(e)?\b/.test(n)) return 'gelatin';

  // Other stabilizers: pectin, agar, carrageenan, lbg, xanthan
  if (universal === 'hydrocolloid') return 'stabilizer';

  // Fruit / vegetable purees → 'puree'
  if (/\bpur(é|e)e?\b|\bcoulis\b/.test(n)) return 'puree';

  // Powders (cocoa powder, freeze-dried, etc.) — but NOT milk powder, that's earlier
  if (/\bpowder\b/.test(n)) return 'powder';

  // Flavor oils / extracts / infusions
  if (universal === 'flavor') {
    if (/\boil\b|\bessence\b|\bextract\b/.test(n)) return 'flavor_oil';
    return 'infusion';
  }

  // Cream — guarded against negatives (sour cream, ice cream, etc. — but those
  // never get role='liquid' from Milestone C heuristics, so this catch is safe)
  if (universal === 'liquid' && /\bcream\b/.test(n)) return 'cream';

  // Butter — guarded against nut butters (those become 'inclusion' via Milestone C)
  if (universal === 'fat' && /\bbutter\b/.test(n) && !/cocoa butter/.test(n)) return 'butter';

  // Inclusion (nuts, dried fruit, chips, nibs) keeps its universal role's mapping
  if (universal === 'inclusion') return 'inclusion';

  // Sugar additions
  if (universal === 'sweetener') return 'sugar_add';

  // Fall back to the role→subtype map
  return universal ? (CONFECTIONERY_ROLE_SUBTYPE_MAP[universal] ?? null) : null;
}
