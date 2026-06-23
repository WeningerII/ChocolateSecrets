/**
 * Gelation — a gelling agent above its minimum concentration builds a network
 * that traps liquid into a gel. Each hydrocolloid has its own minimum dose, set
 * and melt temperatures, thermoreversibility, texture and co-factor requirements
 * (high sugar, calcium, potassium). This is a table-driven kernel: the caller
 * identifies the agent and its concentration; the kernel returns whether it
 * gels, its set/melt window, strength and character.
 *
 * Calibrated (hydrocolloid tables). Universal to jellies, custards, confits,
 * jams, pâtes de fruit, plant-based set systems.
 *
 * Sources: hydrocolloid handbooks (Phillips & Williams); pectin/agar/carrageenan
 * set data; gelatin bloom behavior.
 */
export type GellingAgent =
  | 'gelatin' | 'agar' | 'pectin_hm' | 'pectin_lm'
  | 'kappa_carrageenan' | 'iota_carrageenan' | 'starch'
  | 'methylcellulose' | 'sodium_alginate';

export type GelCharacter = 'elastic' | 'brittle' | 'soft' | 'firm' | 'thermo_inverse';
type CoFactor = 'high_sugar' | 'calcium' | 'potassium';

interface GelProfile {
  minConcentrationPct: number;
  /** Temperature the gel sets at on cooling (°C); null when not cool-set. */
  setTempC: number | null;
  /** Temperature the gel melts at (°C); null when thermo-irreversible. */
  meltTempC: number | null;
  thermoreversible: boolean;
  character: GelCharacter;
  requires?: CoFactor;
}

const GEL_PROFILES: Record<GellingAgent, GelProfile> = {
  gelatin: { minConcentrationPct: 0.5, setTempC: 15, meltTempC: 30, thermoreversible: true, character: 'elastic' },
  agar: { minConcentrationPct: 0.5, setTempC: 38, meltTempC: 85, thermoreversible: true, character: 'brittle' },
  pectin_hm: { minConcentrationPct: 0.5, setTempC: 60, meltTempC: null, thermoreversible: false, character: 'soft', requires: 'high_sugar' },
  pectin_lm: { minConcentrationPct: 0.5, setTempC: 50, meltTempC: null, thermoreversible: false, character: 'soft', requires: 'calcium' },
  kappa_carrageenan: { minConcentrationPct: 0.5, setTempC: 45, meltTempC: 60, thermoreversible: true, character: 'firm', requires: 'potassium' },
  iota_carrageenan: { minConcentrationPct: 0.5, setTempC: 45, meltTempC: 65, thermoreversible: true, character: 'elastic', requires: 'calcium' },
  starch: { minConcentrationPct: 3, setTempC: 40, meltTempC: null, thermoreversible: false, character: 'soft' },
  methylcellulose: { minConcentrationPct: 1, setTempC: null, meltTempC: 50, thermoreversible: true, character: 'thermo_inverse' },
  sodium_alginate: { minConcentrationPct: 0.5, setTempC: null, meltTempC: null, thermoreversible: false, character: 'firm', requires: 'calcium' },
};

export type GelationFlag =
  | { kind: 'below_min_concentration'; minPct: number }
  | { kind: 'cofactor_required'; cofactor: CoFactor }
  | { kind: 'cofactor_unknown'; cofactor: CoFactor };

export interface GelationContext {
  sugarBrix?: number;
  hasCalcium?: boolean;
  hasPotassium?: boolean;
}

export interface GelationResult {
  agent: GellingAgent;
  gels: boolean;
  setTempC: number | null;
  meltTempC: number | null;
  thermoreversible: boolean;
  character: GelCharacter;
  /** Relative gel strength 0..1 from dose above the minimum. */
  strength: number;
  flags: GelationFlag[];
}

/** Whether a co-factor requirement is met (or unknown) given the context. */
function cofactorMet(req: CoFactor, ctx: GelationContext): boolean | undefined {
  if (req === 'high_sugar') return ctx.sugarBrix === undefined ? undefined : ctx.sugarBrix >= 55;
  if (req === 'calcium') return ctx.hasCalcium;
  return ctx.hasPotassium; // potassium
}

export function computeGelation(
  agent: GellingAgent,
  concentrationPct: number,
  ctx: GelationContext = {},
): GelationResult {
  const p = GEL_PROFILES[agent];
  const flags: GelationFlag[] = [];

  const aboveMin = concentrationPct >= p.minConcentrationPct;
  if (!aboveMin) flags.push({ kind: 'below_min_concentration', minPct: p.minConcentrationPct });

  let cofactorOk = true;
  if (p.requires) {
    const met = cofactorMet(p.requires, ctx);
    if (met === undefined) flags.push({ kind: 'cofactor_unknown', cofactor: p.requires });
    else if (!met) { flags.push({ kind: 'cofactor_required', cofactor: p.requires }); cofactorOk = false; }
  }

  const gels = aboveMin && cofactorOk;
  // Strength saturates with dose above the minimum (≈ full at ~4× the minimum).
  const strength = aboveMin ? Math.min(1, (concentrationPct - p.minConcentrationPct) / (3 * p.minConcentrationPct)) : 0;

  return {
    agent,
    gels,
    setTempC: p.setTempC,
    meltTempC: p.meltTempC,
    thermoreversible: p.thermoreversible,
    character: p.character,
    strength,
    flags,
  };
}
