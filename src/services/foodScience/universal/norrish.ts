import type { ResolvedIngredient, AwResult, AwFlag } from './types';
import type { CompositionSpecies } from '../../../types';

export const NORRISH_K: Record<string, number> = {
  sucrose: 6.47,
  maltose: 4.54,
  glucose: 2.25,
  fructose: 2.25,
  lactose: 10.2,
  sorbitol: 1.66,
  glycerol: 1.15,
  ethanol: 1.60,
};

export const MOLECULAR_WEIGHTS: Record<string, number> = {
  water: 18.02,
  sucrose: 342.30,
  maltose: 342.30,
  glucose: 180.16,
  fructose: 180.16,
  lactose: 342.30,
  sorbitol: 182.17,
  glycerol: 92.09,
  ethanol: 46.07,
};

export const NORRISH_SPECIES: ReadonlyArray<CompositionSpecies> = [
  'water', 'sucrose', 'glucose', 'fructose', 'lactose',
  'maltose', 'sorbitol', 'glycerol', 'ethanol',
];

export const ETHANOL_RETENTION = 0.90;

/**
 * Calculate water activity for a list of resolved ingredients using Norrish's equation.
 *
 *   ln(Aw) = ln(Xw) − Σᵢ Kᵢ · Xᵢ²
 *
 * where Xᵢ is mole fraction of species i in the aqueous phase. Fat, protein, ash are
 * non-aqueous and excluded from mole-fraction calculation but tracked for fatPct.
 *
 * Ethanol mass is multiplied by ETHANOL_RETENTION before mole-fraction calculation
 * if applyEthanolRetention is true. Default: true (any added alcohol assumed to lose
 * 10% during prep). Frozen / cold-application categories may override to 1.0.
 */
export function calculateNorrishAw(
  ingredients: ResolvedIngredient[],
  options: { applyEthanolRetention?: boolean } = {}
): AwResult {
  const applyRetention = options.applyEthanolRetention ?? true;
  const flags: AwFlag[] = [];

  const massBy: Record<string, number> = {};
  for (const sp of NORRISH_SPECIES) massBy[sp] = 0;
  let totalMass = 0;
  let totalFat = 0;

  for (const ing of ingredients) {
    totalMass += ing.mass;
    const c = ing.composition;
    totalFat += ing.mass * (c.fat ?? 0) / 100;

    for (const sp of NORRISH_SPECIES) {
      let pct = (c as Record<string, number | undefined>)[sp] ?? 0;
      if (sp === 'ethanol' && applyRetention) pct *= ETHANOL_RETENTION;
      massBy[sp] += ing.mass * pct / 100;
    }

    if (ing.compositionSource === 'category_default' || ing.compositionSource === 'unknown') {
      flags.push({ kind: 'composition_fallback', ingredientId: ing.ingredientId, source: ing.compositionSource });
    }
  }

  if (massBy.water <= 0) {
    return {
      aw: null, Xw: 0, lnXw: -Infinity, terms: [],
      massBy, moles: {}, aqueousMass: 0,
      aqueousSugarPct: 0, waterPct: 0,
      fatPct: totalMass > 0 ? (totalFat / totalMass) * 100 : 0,
      totalMass, flags: [...flags, { kind: 'no_water' }],
    };
  }

  const moles: Record<string, number> = {};
  let totalMoles = 0;
  for (const sp of NORRISH_SPECIES) {
    moles[sp] = massBy[sp] > 0 ? massBy[sp] / MOLECULAR_WEIGHTS[sp] : 0;
    totalMoles += moles[sp];
  }

  const X: Record<string, number> = {};
  for (const sp of NORRISH_SPECIES) X[sp] = totalMoles > 0 ? moles[sp] / totalMoles : 0;

  let lnAw = Math.log(X.water);
  const terms: AwResult['terms'] = [];
  for (const sp of NORRISH_SPECIES) {
    if (sp === 'water' || X[sp] === 0) continue;
    const K = NORRISH_K[sp];
    if (!K) continue;
    const contribution = K * X[sp] * X[sp];
    lnAw -= contribution;
    terms.push({
      species: sp, X: X[sp], K, contribution,
      mass: massBy[sp], moles: moles[sp],
    });
  }

  const aw = Math.exp(lnAw);
  const aqueousMass = NORRISH_SPECIES.reduce((acc, sp) => acc + massBy[sp], 0);
  const sugarMass = aqueousMass - massBy.water;

  if (massBy.lactose > 0) flags.push({ kind: 'lactose_upper_bound' });
  if (massBy.ethanol > 0 && applyRetention) flags.push({ kind: 'ethanol_volatility_applied' });

  const aqueousSugarPct = aqueousMass > 0 ? (sugarMass / aqueousMass) * 100 : 0;
  if (aqueousSugarPct > 75) flags.push({ kind: 'extreme_saturation', aqueousSugarPct });

  return {
    aw: isFinite(aw) && aw >= 0 ? Math.min(aw, 1.0) : null,
    Xw: X.water,
    lnXw: Math.log(X.water),
    terms,
    massBy,
    moles,
    aqueousMass,
    aqueousSugarPct,
    waterPct: totalMass > 0 ? (massBy.water / totalMass) * 100 : 0,
    fatPct: totalMass > 0 ? (totalFat / totalMass) * 100 : 0,
    totalMass,
    flags,
  };
}
