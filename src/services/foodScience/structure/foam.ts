/**
 * Foam capacity and stability — gas dispersed in a liquid, stabilized by
 * surface-active agents (proteins above all) and by a viscous/structured
 * continuous phase (dissolved sugar, hydrocolloids), and destabilized by free
 * fat, which defoams by spreading at the air–water interface and displacing the
 * protein film.
 *
 *   foamability ∝ protein (interfacial film former)
 *   stability   ∝ protein · sugar-viscosity, ÷ fat antagonism
 *
 * Calibrated/proxy, from composition. Universal (egg foams, meringue, mousse,
 * whipped toppings, beer crema). NOTE: fat-structured foams like whipped cream
 * are the exception — there fat IS the stabilizer; this v1 treats fat as a
 * destabilizer (true for protein foams) and flags it.
 *
 * Sources: protein foaming (Damodaran); sugar stabilization; fat antagonism.
 */
import type { Composition } from '../../../types';

/** Protein (% of mix) at which foaming capacity half-saturates. */
const PROTEIN_HALF_SAT = 3;
/** Fat (% of mix) giving a strong defoaming penalty. */
const FAT_PENALTY_SCALE = 75;

export type FoamBand = 'none' | 'poor' | 'fair' | 'good';

export type FoamFlag =
  | { kind: 'no_foaming_agent' }
  | { kind: 'fat_destabilizing' };

export interface FoamResult {
  /** Foaming capacity 0..1 (how much foam can form). */
  foamability: number;
  /** Foam stability 0..100 (how well it holds). */
  stability: number;
  band: FoamBand;
  flags: FoamFlag[];
}

const saturating = (x: number, halfSat: number): number => (x > 0 ? x / (x + halfSat) : 0);

function classifyBand(stability: number, hasAgent: boolean): FoamBand {
  if (!hasAgent || stability <= 0) return 'none';
  if (stability < 25) return 'poor';
  if (stability < 55) return 'fair';
  return 'good';
}

export function computeFoam(composition: Composition): FoamResult {
  const protein = composition.protein ?? 0;
  const sugar =
    (composition.sucrose ?? 0) + (composition.glucose ?? 0) + (composition.fructose ?? 0) +
    (composition.lactose ?? 0) + (composition.maltose ?? 0);
  const fat = composition.fat ?? 0;

  const flags: FoamFlag[] = [];
  const foamability = saturating(protein, PROTEIN_HALF_SAT);
  if (protein <= 0) flags.push({ kind: 'no_foaming_agent' });

  const sugarViscosityFactor = 1 + Math.min(0.5, sugar / 100); // dissolved sugar slows drainage
  const fatPenalty = 1 - Math.min(0.8, fat / FAT_PENALTY_SCALE);
  if (fat > 5 && fatPenalty < 0.85) flags.push({ kind: 'fat_destabilizing' });

  const stability = Math.max(0, Math.min(100, foamability * sugarViscosityFactor * fatPenalty * 100));

  return { foamability, stability, band: classifyBand(stability, protein > 0), flags };
}
