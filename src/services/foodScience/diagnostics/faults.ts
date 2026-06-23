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
 * Scope note: keeping-quality faults (texture, set, rancidity, migration, flavor
 * balance) live here. Microbial SAFETY (a_w / pH / declared-shelf-life) is
 * intent-dependent and is surfaced separately as recipe warnings for now.
 */
import type { EmulsionResult, GelationResult, FormulaBalanceResult } from '../structure';
import type { TasteProfile, PalatabilityResult } from '../perception';
import type { OxidationResult, MoistureMigrationResult } from '../process';

export type FaultDomain = 'structure' | 'stability' | 'flavor';
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

type Source = (input: DiagnosticsInput) => Fault[];

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

/** Registry. Append a source to extend the pass to a new fault. */
const SOURCES: Source[] = [
  formulaFaults, emulsionFaults, gelationFaults, stabilityFaults, flavorFaults,
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
