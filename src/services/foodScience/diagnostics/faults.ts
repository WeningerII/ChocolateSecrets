/**
 * Diagnostics — the universal "what could go wrong with this recipe?" pass.
 *
 * This is NOT a baked-goods checker. It is a collector: each fault SOURCE is a
 * small pure function that self-gates on applicability, so it stays silent unless
 * the recipe actually contains the thing it judges. A cake lights up the
 * formula-balance faults; a ganache lights up the emulsion split; a set custard
 * lights up gelation; a stored fatty food lights up rancidity; a layered/filled
 * item lights up moisture migration; anything tasted lights up flavor faults.
 * The same aggregator serves every food because the RECIPE decides which sources
 * fire — not a category switch.
 *
 * It does not re-derive any physics; it reads the kernel outputs the rest of the
 * engine already computes and normalizes their heterogeneous flags into one
 * severity-ranked list with stable `code`s (the UI owns the wording). Adding a
 * new fault is one source function appended to SOURCES — that is how the pass
 * grows to cover more of the field without a rewrite.
 *
 * Safety: the food-safety source is intent-aware. A high-moisture, low-acid food
 * is perfectly normal when eaten fresh; it is only a fault when the recipe also
 * DECLARES a shelf-stable (long, ambient) shelf life it cannot support. The
 * pH 4.6 / a_w 0.85 hurdle thresholds are the FDA Food Code TCS boundaries.
 */
import type { EmulsionResult, GelationResult, FormulaBalanceResult } from '../structure';
import type { TasteProfile, PalatabilityResult } from '../perception';
import type { OxidationResult, MoistureMigrationResult, DonenessResult, MaillardResult } from '../process';
import type { CrystallizationResult, ShelfLifePrediction } from '../universal';

export type FaultDomain = 'safety' | 'structure' | 'process' | 'stability' | 'flavor';
export type FaultSeverity = 'info' | 'warn' | 'high';

export interface Fault {
  /** Stable code the UI maps to wording, e.g. 'emulsion_will_split'. */
  code: string;
  domain: FaultDomain;
  severity: FaultSeverity;
  /** Optional actual-vs-threshold numbers for an "x / y" readout. */
  detail?: { value: number; threshold: number };
}

/** Every kernel output a fault source might read. All optional — only what the
 *  recipe produced is passed; absent inputs simply contribute nothing. */
export interface DiagnosticsInput {
  emulsion?: EmulsionResult | null;
  gelation?: GelationResult | null;
  formulaBalance?: FormulaBalanceResult | null;
  taste?: TasteProfile | null;
  palatability?: PalatabilityResult | null;
  oxidation?: OxidationResult | null;
  moisture?: MoistureMigrationResult | null;
  curdleLevel?: 'none' | 'low' | 'medium' | 'high' | null;
  /** Core-temperature doneness over the bake profile (null when no thermal step). */
  doneness?: DonenessResult | null;
  /** Maillard browning over the bake profile (null when no thermal step). */
  browning?: MaillardResult | null;
  /** Sugar graining risk at storage temperature. */
  crystallization?: CrystallizationResult | null;
  /** True when incompatible chocolate classes are mixed (temper/bloom risk). */
  chocolateClassesMixed?: boolean;
  /** Shelf-life prediction (read for the declared-vs-predicted divergence). */
  shelfLife?: ShelfLifePrediction | null;
  // --- intent-aware food-safety inputs ---
  /** Equilibrium water activity (null when no water). */
  aw?: number | null;
  /** Mixed-system pH (null when no buffer data). */
  pH?: number | null;
  /** Declared shelf life (days); used to infer shelf-stable/ambient intent. */
  declaredShelfLifeDays?: number | null;
  /** Potere Anti-Congelante (PAC) for frozen desserts; high PAC → too soft at cabinet temp. */
  pac?: number | null;
}

export interface DiagnosticsResult {
  /** Faults, ranked worst-first. */
  faults: Fault[];
  counts: Record<FaultSeverity, number>;
  /** Highest severity present, or null when the recipe is clean. */
  worst: FaultSeverity | null;
}

/** A single taste this loud reads as "too much of it." */
const OVER_INTENSE = 85;

// Food-safety hurdle thresholds (FDA Food Code TCS / 21 CFR 114).
const TCS_PH = 4.6;     // at or below: acid hurdle holds
const TCS_AW = 0.85;    // at or below: water-activity hurdle holds
/** Declared shelf life (days) at/above which we infer shelf-stable (ambient) intent. */
const SHELF_STABLE_DAYS = 30;

type Source = (input: DiagnosticsInput) => Fault[];

/** Food safety: a low-acid, high-moisture food sold as shelf-stable is unsafe.
 *  Intent-aware — only fires when a long ambient shelf life is declared. */
const safetyFaults: Source = ({ aw, pH, declaredShelfLifeDays }) => {
  if (aw == null || pH == null || declaredShelfLifeDays == null) return [];
  const claimsShelfStable = declaredShelfLifeDays >= SHELF_STABLE_DAYS;
  if (claimsShelfStable && pH > TCS_PH && aw > TCS_AW) {
    return [{ code: 'safety_not_shelf_stable', domain: 'safety', severity: 'high' }];
  }
  return [];
};

/** Cake-balance ratios → predicted crumb faults (already self-gated to batters). */
const formulaFaults: Source = ({ formulaBalance }) => {
  if (!formulaBalance?.applicable) return [];
  return formulaBalance.faults.map(f => ({
    code: `formula_${f.kind}`,
    domain: 'structure' as const,
    severity: f.severity,
    detail: { value: f.ratio, threshold: f.threshold },
  }));
};

/** Emulsion at risk of breaking/splitting (phase volume past packing). */
const emulsionFaults: Source = ({ emulsion }) => {
  if (!emulsion || emulsion.type === 'none') return [];
  if (!emulsion.flags.some(f => f.kind === 'near_inversion')) return [];
  return [{
    code: 'emulsion_will_split',
    domain: 'structure',
    severity: emulsion.stability === 'unstable' ? 'high' : 'warn',
  }];
};

/** A gelling agent that won't set, or is missing its co-factor. */
const gelationFaults: Source = ({ gelation }) => {
  if (!gelation) return [];
  if (!gelation.gels) {
    return [{ code: 'gelation_wont_set', domain: 'structure', severity: 'warn' }];
  }
  if (gelation.flags.some(f => f.kind === 'cofactor_required' || f.kind === 'cofactor_unknown')) {
    return [{ code: 'gelation_cofactor_missing', domain: 'structure', severity: 'warn' }];
  }
  return [];
};

/** Bake/cook outcome: core temperature short of set is under-/undercooked. */
const donenessFaults: Source = ({ doneness }) => {
  if (!doneness) return [];
  if (doneness.band === 'raw') return [{ code: 'doneness_raw', domain: 'process', severity: 'high' }];
  if (doneness.band === 'underdone') return [{ code: 'doneness_underdone', domain: 'process', severity: 'warn' }];
  return [];
};

/** Bake/cook outcome: browning saturated to the dark extreme reads as over-baked. */
const browningFaults: Source = ({ browning }) => {
  if (browning?.band === 'dark') return [{ code: 'over_browning', domain: 'process', severity: 'warn' }];
  return [];
};

/** Mixing chocolate classes disrupts cocoa-butter crystallization → temper/bloom. */
const chocolateFaults: Source = ({ chocolateClassesMixed }) => {
  if (!chocolateClassesMixed) return [];
  return [{ code: 'chocolate_bloom_risk', domain: 'structure', severity: 'warn' }];
};

/** The declared shelf life exceeds what the preservation model can support. */
const shelfLifeFaults: Source = ({ shelfLife }) => {
  if (shelfLife?.flags.some(f => f.kind === 'declared_diverges')) {
    return [{ code: 'shelf_life_short', domain: 'stability', severity: 'high' }];
  }
  return [];
};

/** Sugar graining: a supersaturated syrup that will crystallize gritty. */
const grainingFaults: Source = ({ crystallization }) => {
  if (!crystallization) return [];
  if (crystallization.risk === 'high') return [{ code: 'graining_risk', domain: 'structure', severity: 'warn' }];
  if (crystallization.risk === 'moderate') return [{ code: 'graining_risk', domain: 'structure', severity: 'info' }];
  return [];
};

/** Keeping-quality: rancidity, moisture migration between phases, curdling. */
const stabilityFaults: Source = ({ oxidation, moisture, curdleLevel }) => {
  const out: Fault[] = [];
  if (oxidation && (oxidation.band === 'high' || oxidation.band === 'severe')) {
    out.push({ code: 'oxidation_rancidity', domain: 'stability', severity: oxidation.band === 'severe' ? 'high' : 'warn' });
  }
  if (moisture && moisture.band === 'high') {
    out.push({ code: 'moisture_migration', domain: 'stability', severity: 'warn' });
  }
  if (curdleLevel === 'high') out.push({ code: 'curdle_risk', domain: 'stability', severity: 'high' });
  else if (curdleLevel === 'medium') out.push({ code: 'curdle_risk', domain: 'stability', severity: 'warn' });
  return out;
};

/** Flavor balance: a single overpowering taste, or an unbalanced aversive. */
const flavorFaults: Source = ({ taste, palatability }) => {
  const out: Fault[] = [];
  if (taste) {
    for (const q of ['sweet', 'salty', 'sour', 'bitter'] as const) {
      const v = taste[q];
      if (v != null && v > OVER_INTENSE) {
        out.push({ code: `flavor_too_${q}`, domain: 'flavor', severity: 'warn' });
      }
    }
  }
  if (palatability) {
    for (const f of palatability.flags) {
      if (f.kind === 'dominant_aversive') {
        out.push({ code: `flavor_dominant_${f.taste}`, domain: 'flavor', severity: 'warn' });
      }
    }
  }
  return out;
};

/** Frozen-texture fault: a PAC well above the gelato sweet-spot (~260) → too soft at cabinet. */
const PAC_TOO_SOFT = 260;
const frozenTextureFaults: Source = ({ pac }) => {
  if (pac == null) return [];
  if (pac > PAC_TOO_SOFT) {
    return [{ code: 'ice_cream_too_soft', domain: 'structure', severity: 'warn',
              detail: { value: pac, threshold: PAC_TOO_SOFT } }];
  }
  return [];
};

/** Registry. Append a source to extend the pass to a new fault. */
const SOURCES: Source[] = [
  safetyFaults, shelfLifeFaults,
  formulaFaults, emulsionFaults, gelationFaults, donenessFaults, browningFaults,
  grainingFaults, chocolateFaults, stabilityFaults, flavorFaults, frozenTextureFaults,
];

const SEVERITY_RANK: Record<FaultSeverity, number> = { high: 0, warn: 1, info: 2 };

/**
 * Run every fault source over the recipe's computed physics and return one
 * severity-ranked digest. Pass whatever kernel outputs exist; the rest stay null.
 */
export function collectFaults(input: DiagnosticsInput): DiagnosticsResult {
  const faults = SOURCES.flatMap(s => s(input));
  faults.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  const counts: Record<FaultSeverity, number> = { high: 0, warn: 0, info: 0 };
  for (const f of faults) counts[f.severity]++;

  return { faults, counts, worst: faults.length ? faults[0].severity : null };
}
