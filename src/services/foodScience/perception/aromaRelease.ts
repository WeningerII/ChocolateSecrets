/**
 * Aroma release — how the food MATRIX modulates the aroma that reaches the nose.
 *
 * This is the tractable half of the aroma problem. The other half — which
 * volatiles a food contains and what they smell like (structure→odor character)
 * — is the ML-hard frontier and is NOT modeled here. But how much of a given
 * volatile escapes the matrix into the headspace is first-principles partition
 * thermodynamics, and it is dominated by one well-documented effect: FAT TRAPS
 * AROMA. Lipophilic volatiles dissolve into the fat phase and are held back from
 * the air, which is why a lean sorbet reads loud and bright while a high-fat
 * ganache of the "same" flavor reads muted and rounded.
 *
 * Model — three-phase (air / oil / water) equilibrium partition. With
 *   K_ow = C_oil/C_water = 10^logP   (octanol–water partition; the lipophilicity)
 * the headspace fraction of a trace volatile, taken relative to the same volatile
 * in an all-aqueous matrix of equal condensed volume, simplifies (dilute limit,
 * where the air-water term is negligible so K_aw cancels) to
 *
 *   release = 1 / (1 + φ_oil · (K_ow − 1))
 *
 * φ_oil is the oil volume fraction of the oil+water phase. release = 1 means the
 * matrix releases as freely as water; release < 1 means fat is holding the
 * volatile in reserve. The compound enters only through its measured log P, so
 * nothing is invented: the classes below are anchored to REAL volatiles with
 * tabulated log P values, spanning polar to nonpolar aroma.
 *
 * First-principles (mass balance + partition). It is an EQUILIBRIUM headspace
 * ratio, relative not absolute: it says how this matrix re-weights aroma by
 * polarity, not what the aroma is. Kinetics (sustained release while eating),
 * salting-out by dissolved solutes, and temperature are documented secondary
 * effects not yet included.
 *
 * Sources: octanol–water log P (PubChem). Fat/matrix control of flavor release:
 * Guichard, "Flavour retention and release from the food matrix" (2002/2006);
 * de Roos partition models.
 */
import type { Composition } from '../../../types';

const FAT_DENSITY = 0.92;   // g·mL⁻¹
const WATER_DENSITY = 1.0;  // g·mL⁻¹

export type VolatilePolarity = 'polar' | 'medium' | 'nonpolar';

/** Representative aroma volatiles anchoring each polarity class (measured log P). */
const POLARITY_ANCHORS: Record<VolatilePolarity, { logP: number; example: string }> = {
  polar:    { logP: 0.73, example: 'ethyl_acetate' }, // fruity ester
  medium:   { logP: 1.78, example: 'hexanal' },       // green / grassy aldehyde
  nonpolar: { logP: 4.57, example: 'limonene' },      // citrus terpene
};

export type AromaBand = 'muted' | 'moderate' | 'free';

export type AromaReleaseFlag =
  | { kind: 'no_fat' }                                            // nothing to trap aroma — every class releases freely
  | { kind: 'no_matrix' }                                         // no oil or water phase — model degenerate
  | { kind: 'fat_reservoir' }                                     // enough fat to hold lipophilic aroma in reserve
  | { kind: 'near_total_trapping'; polarity: VolatilePolarity };  // releaseFactor < 1 % — effectively zero headspace

export interface AromaReleaseClass {
  polarity: VolatilePolarity;
  /** i18n-safe key for the anchoring example volatile. */
  example: string;
  logP: number;
  /** Headspace release relative to an all-aqueous matrix (1.0); <1 = fat-trapped. */
  releaseFactor: number;
  band: AromaBand;
}

export interface AromaReleaseResult {
  /** Oil volume fraction of the condensed (oil+water) phase. */
  oilPhaseFraction: number;
  classes: AromaReleaseClass[];
  flags: AromaReleaseFlag[];
}

function classifyBand(release: number): AromaBand {
  if (release >= 0.66) return 'free';
  if (release >= 0.2) return 'moderate';
  return 'muted';
}

/**
 * Relative aroma-release profile of a matrix, by volatile polarity. Pass the
 * mix composition; reads fat and water to find the oil fraction.
 */
export function computeAromaRelease(composition: Composition): AromaReleaseResult {
  const fat = composition.fat ?? 0;
  const water = composition.water ?? 0;
  const oilVol = fat / FAT_DENSITY;
  const waterVol = water / WATER_DENSITY;
  const total = oilVol + waterVol;

  const flags: AromaReleaseFlag[] = [];
  const phiOil = total > 0 ? oilVol / total : 0;

  if (total <= 0) flags.push({ kind: 'no_matrix' });
  else if (fat <= 0) flags.push({ kind: 'no_fat' });
  else if (phiOil >= 0.3) flags.push({ kind: 'fat_reservoir' });

  const classes: AromaReleaseClass[] = (Object.keys(POLARITY_ANCHORS) as VolatilePolarity[]).map(polarity => {
    const { logP, example } = POLARITY_ANCHORS[polarity];
    const kOw = Math.pow(10, logP);
    const releaseFactor = 1 / (1 + phiOil * (kOw - 1));
    if (releaseFactor < 0.01) flags.push({ kind: 'near_total_trapping', polarity });
    return { polarity, example, logP, releaseFactor, band: classifyBand(releaseFactor) };
  });

  return { oilPhaseFraction: phiOil, classes, flags };
}
