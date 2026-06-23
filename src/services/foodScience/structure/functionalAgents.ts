/**
 * Functional-ingredient catalog — resolves an ingredient NAME to the structural
 * role it plays and the property the structure kernels need: an emulsifier's HLB,
 * or which gelling agent it is. This mirrors the USDA-composition snapshot
 * pattern (name → data) so no Ingredient-type change is required; the hook scans
 * resolved leaves and feeds the matches to computeEmulsion / computeGelation.
 *
 * Sources: Griffin HLB values for common food emulsifiers; standard hydrocolloid
 * identities.
 */
import type { GellingAgent } from './gelation';

export type FunctionalAgent =
  | { kind: 'emulsifier'; name: string; hlb: number }
  | { kind: 'gelling_agent'; name: string; agent: GellingAgent };

// Ordered: more specific patterns first (iota before generic carrageenan, etc.).
const PATTERNS: Array<{ match: RegExp; build: (name: string) => FunctionalAgent }> = [
  // --- gelling agents ---
  { match: /\bagar(\s*-?\s*agar)?\b/i, build: (name) => ({ kind: 'gelling_agent', name, agent: 'agar' }) },
  { match: /gelatin[ea]?\b/i, build: (name) => ({ kind: 'gelling_agent', name, agent: 'gelatin' }) },
  { match: /(low[-\s]?methoxyl|\blm[-\s]?pectin)/i, build: (name) => ({ kind: 'gelling_agent', name, agent: 'pectin_lm' }) },
  { match: /\bpectin\b/i, build: (name) => ({ kind: 'gelling_agent', name, agent: 'pectin_hm' }) },
  { match: /iota[-\s]?carrageenan/i, build: (name) => ({ kind: 'gelling_agent', name, agent: 'iota_carrageenan' }) },
  { match: /carrageenan/i, build: (name) => ({ kind: 'gelling_agent', name, agent: 'kappa_carrageenan' }) },
  { match: /methyl\s*cellulose/i, build: (name) => ({ kind: 'gelling_agent', name, agent: 'methylcellulose' }) },
  { match: /alginate/i, build: (name) => ({ kind: 'gelling_agent', name, agent: 'sodium_alginate' }) },
  { match: /(corn\s*starch|cornstarch|tapioca|arrowroot|potato\s*starch|\bstarch\b)/i, build: (name) => ({ kind: 'gelling_agent', name, agent: 'starch' }) },
  // --- emulsifiers (HLB) ---
  { match: /polysorbate|tween/i, build: (name) => ({ kind: 'emulsifier', name, hlb: 15 }) },
  { match: /\bspan\b|sorbitan/i, build: (name) => ({ kind: 'emulsifier', name, hlb: 4.3 }) },
  { match: /mono\s*-?\s*(and|&)?\s*-?\s*diglycerid|glyceryl\s*mono|\bgms\b|\bdmg\b/i, build: (name) => ({ kind: 'emulsifier', name, hlb: 3.8 }) },
  { match: /stearoyl\s*lactylate|\bssl\b|\bcsl\b/i, build: (name) => ({ kind: 'emulsifier', name, hlb: 8 }) },
  { match: /lecithin/i, build: (name) => ({ kind: 'emulsifier', name, hlb: 8 }) },
  { match: /egg\s*yolk/i, build: (name) => ({ kind: 'emulsifier', name, hlb: 8 }) }, // yolk lecithin
];

/** Resolve an ingredient name to its functional agent, or null if not one. */
export function resolveFunctionalAgent(name: string): FunctionalAgent | null {
  for (const p of PATTERNS) {
    if (p.match.test(name)) return p.build(name);
  }
  return null;
}
