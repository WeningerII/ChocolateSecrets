/**
 * Chemesthesis — the trigeminal/somatosensory layer of flavor: the sensations
 * that are neither taste (gustatory) nor smell (olfactory) but chemically
 * triggered touch — heat, cooling, the sharp nasal sting of mustard, astringent
 * pucker, the bite of carbonation, the tingle of Sichuan pepper.
 *
 * These are NOT a wall. Each modality has a known molecular sensor and a
 * concentration-driven, saturating dose-response (Beidler-style), exactly like
 * the basic tastes:
 *   pungency (burning)  — TRPV1: capsaicinoids, piperine, gingerol → Scoville (SHU)
 *   nasal pungency      — TRPA1: allyl isothiocyanate (mustard/wasabi), allicin,
 *                         cinnamaldehyde — the sharp "sinus" sting
 *   cooling             — TRPM8: menthol (eucalyptol/camphor are weaker)
 *   astringency         — mechano-chemical: tannins precipitate salivary proteins
 *   carbonation         — ASIC3/TRPA1 (carbonic acid) + mechanical: dissolved CO₂
 *   tingle/paresthesia  — KCNK (2-pore K⁺): sanshools (Sichuan pepper)
 *
 * Inputs are the responsible-compound concentrations (these trace actives are not
 * in the macro composition model, so they're supplied explicitly — the same way
 * the taste kernel takes titratable acidity). Output is perceived intensity
 * (0–100) per channel, plus the channel's own scale where one exists (Scoville
 * for pungency; carbonation volumes for CO₂).
 *
 * Grounded: Scoville anchor capsaicin = 16,000,000 SHU ⇒ 16 SHU·ppm⁻¹; 1
 * carbonation "volume" = CO₂ STP density ≈ 1.96 g·L⁻¹ (both Wolfram-checked).
 * Relative capsaicinoid potencies and the Beidler half-maxima are calibrated to
 * recognizable references (a jalapeño, a hot sauce, a soda, a mint), not fit to a
 * panel. Cross-modal interactions (sweetness/fat dampening burn, menthol–capsaicin
 * crosstalk) are real but not modeled — channels are independent here.
 *
 * Sources: Caterina et al. (TRPV1, 1997); McKemy (TRPM8, 2002); Bandell/Bautista
 * (TRPA1); Green (chemesthesis reviews); ASTA 21.3 (capsaicinoids → SHU).
 */

import type { Composition } from '../../../types';

export type Chemoreceptor = 'TRPV1' | 'TRPA1' | 'TRPM8' | 'ASIC3/TRPA1' | 'mechano-chemical' | 'KCNK';

export type ChemesthesisFlag =
  | { kind: 'no_chemesthetic_agonists' };

/** Concentrations of the responsible compounds. ppm = mg·kg⁻¹ unless noted. */
export interface ChemesthesisInput {
  // TRPV1 burning pungency
  capsaicinoidsPpm?: number;        // chili (capsaicin + dihydrocapsaicin)
  piperinePpm?: number;             // black/white pepper
  gingerolPpm?: number;             // ginger ([6]-gingerol)
  // TRPA1 sharp / nasal pungency
  allylIsothiocyanatePpm?: number;  // mustard, wasabi, horseradish
  allicinPpm?: number;              // garlic, onion
  cinnamaldehydePpm?: number;       // cinnamon
  // TRPM8 cooling
  mentholPpm?: number;              // mint (eucalyptol/camphor fold in as menthol-equiv)
  // astringency
  tanninsGPerL?: number;            // tea, wine, unripe fruit (g·L⁻¹)
  // carbonation
  co2GPerL?: number;                // dissolved CO₂ (g·L⁻¹)
  // paresthesia
  sanshoolPpm?: number;             // Sichuan pepper
}

export interface ChemesthesisChannel {
  /** Perceived intensity, 0–100. */
  intensity: number;
  band: string;
  receptor: Chemoreceptor;
}

export interface ChemesthesisProfile {
  pungency: ChemesthesisChannel & { scovilleSHU: number };
  nasalPungency: ChemesthesisChannel;
  cooling: ChemesthesisChannel;
  astringency: ChemesthesisChannel;
  carbonation: ChemesthesisChannel & { volumes: number };
  tingle: ChemesthesisChannel;
  flags: ChemesthesisFlag[];
}

// --- Grounding constants --------------------------------------------------
/** Pure capsaicin = 16,000,000 SHU at 1,000,000 ppm ⇒ 16 SHU per capsaicin-equiv ppm. */
const SHU_PER_CAPEQ_PPM = 16;
/** 1 carbonation "volume" = density of CO₂ at STP ≈ 1.96 g·L⁻¹ (Wolfram: 1.9636). */
const CO2_GL_PER_VOLUME = 1.96;

/** Capsaicinoid-relative pungency potencies (capsaicin = 1; Scoville literature). */
const CAPSAICIN_EQ: Record<'capsaicinoids' | 'piperine' | 'gingerol', number> = {
  capsaicinoids: 1.0,    // ~capsaicin/dihydrocapsaicin
  piperine: 0.00625,     // ~100,000 SHU equiv
  gingerol: 0.00375,     // ~60,000 SHU equiv
};

/** TRPA1 nasal-pungency potencies relative to allyl isothiocyanate = 1. */
const AITC_EQ: Record<'allylIsothiocyanate' | 'allicin' | 'cinnamaldehyde', number> = {
  allylIsothiocyanate: 1.0,
  allicin: 0.5,
  cinnamaldehyde: 0.3,
};

// --- Beidler half-maxima (calibrated to a recognizable reference ≈ 50/100) ---
const K_PUNGENCY_SHU = 50_000;       // ~a hot sauce sits mid-scale
const K_NASAL_PPM = 50;              // strong mustard/wasabi
const K_COOLING_PPM = 100;           // a peppermint
const K_ASTRINGENCY_GPERL = 1.5;     // a tannic red wine
const K_CARBONATION_GPERL = 5;       // a soft drink (~3.5 vol)
const K_TINGLE_PPM = 100;            // Sichuan málà

const clamp = (x: number): number => Math.max(0, Math.min(100, x));
/** Saturating receptor response (Beidler 1954). */
const beidler = (stimulus: number, halfMax: number): number =>
  stimulus > 0 ? (100 * stimulus) / (stimulus + halfMax) : 0;

const band0to100 = (i: number): string =>
  i <= 0 ? 'none' : i < 15 ? 'faint' : i < 50 ? 'moderate' : i < 80 ? 'strong' : 'intense';

function scovilleBand(shu: number): string {
  if (shu < 100) return 'none';
  if (shu < 2_500) return 'mild';
  if (shu < 25_000) return 'medium';
  if (shu < 100_000) return 'hot';
  if (shu < 350_000) return 'very_hot';
  return 'extreme';
}

function carbonationBand(volumes: number): string {
  if (volumes < 0.5) return 'still';
  if (volumes < 2) return 'light';
  if (volumes < 4) return 'sparkling';
  return 'highly_sparkling';
}

/**
 * Perceived chemesthesis profile from the responsible-compound concentrations.
 * Channels are independent; each returns intensity 0 when its agonists are absent.
 */
export function computeChemesthesis(input: ChemesthesisInput = {}): ChemesthesisProfile {
  const flags: ChemesthesisFlag[] = [];

  // Pungency (TRPV1) → capsaicin-equivalent ppm → Scoville → intensity.
  const capEqPpm =
    (input.capsaicinoidsPpm ?? 0) * CAPSAICIN_EQ.capsaicinoids +
    (input.piperinePpm ?? 0) * CAPSAICIN_EQ.piperine +
    (input.gingerolPpm ?? 0) * CAPSAICIN_EQ.gingerol;
  const scovilleSHU = capEqPpm * SHU_PER_CAPEQ_PPM;
  const pungencyIntensity = clamp(beidler(scovilleSHU, K_PUNGENCY_SHU));

  // Nasal pungency (TRPA1) → AITC-equivalent ppm.
  const aitcEqPpm =
    (input.allylIsothiocyanatePpm ?? 0) * AITC_EQ.allylIsothiocyanate +
    (input.allicinPpm ?? 0) * AITC_EQ.allicin +
    (input.cinnamaldehydePpm ?? 0) * AITC_EQ.cinnamaldehyde;
  const nasalIntensity = clamp(beidler(aitcEqPpm, K_NASAL_PPM));

  // Cooling (TRPM8).
  const coolingIntensity = clamp(beidler(input.mentholPpm ?? 0, K_COOLING_PPM));

  // Astringency (mechano-chemical).
  const astringencyIntensity = clamp(beidler(input.tanninsGPerL ?? 0, K_ASTRINGENCY_GPERL));

  // Carbonation (ASIC3/TRPA1 + mechanical).
  const co2 = input.co2GPerL ?? 0;
  const volumes = co2 / CO2_GL_PER_VOLUME;
  const carbonationIntensity = clamp(beidler(co2, K_CARBONATION_GPERL));

  // Tingle / paresthesia (KCNK).
  const tingleIntensity = clamp(beidler(input.sanshoolPpm ?? 0, K_TINGLE_PPM));

  if (capEqPpm <= 0 && aitcEqPpm <= 0 && (input.mentholPpm ?? 0) <= 0 &&
      (input.tanninsGPerL ?? 0) <= 0 && co2 <= 0 && (input.sanshoolPpm ?? 0) <= 0) {
    flags.push({ kind: 'no_chemesthetic_agonists' });
  }

  return {
    pungency: { intensity: pungencyIntensity, band: scovilleBand(scovilleSHU), receptor: 'TRPV1', scovilleSHU: Math.round(scovilleSHU) },
    nasalPungency: { intensity: nasalIntensity, band: band0to100(nasalIntensity), receptor: 'TRPA1' },
    cooling: { intensity: coolingIntensity, band: band0to100(coolingIntensity), receptor: 'TRPM8' },
    astringency: { intensity: astringencyIntensity, band: band0to100(astringencyIntensity), receptor: 'mechano-chemical' },
    carbonation: { intensity: carbonationIntensity, band: carbonationBand(volumes), receptor: 'ASIC3/TRPA1', volumes: Math.round(volumes * 100) / 100 },
    tingle: { intensity: tingleIntensity, band: band0to100(tingleIntensity), receptor: 'KCNK' },
    flags,
  };
}

/**
 * Drive chemesthesis from the composition's trace-active descriptors, so a recipe
 * carrying chili/mustard/mint/tannin/CO₂/Sichuan-pepper produces the sensation
 * automatically. Composition is uniformly mass %, so bridge to the kernel's units:
 *   ppm  = mass % × 10 000   (mg·kg⁻¹)
 *   g·L⁻¹ = mass % × 10       (g per 100 g ≈ g per 100 mL at density ≈ 1)
 */
export function chemesthesisFromComposition(c: Composition): ChemesthesisProfile {
  const v = (x?: number) => x ?? 0;
  return computeChemesthesis({
    capsaicinoidsPpm: v(c.capsaicinoids) * 10_000,
    allylIsothiocyanatePpm: v(c.allylIsothiocyanate) * 10_000,
    mentholPpm: v(c.menthol) * 10_000,
    sanshoolPpm: v(c.sanshool) * 10_000,
    tanninsGPerL: v(c.tannins) * 10,
    co2GPerL: v(c.dissolvedCO2) * 10,
  });
}
