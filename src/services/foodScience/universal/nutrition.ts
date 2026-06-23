/**
 * Energy and macronutrients — the Atwater system: each macronutrient yields a
 * fixed metabolizable energy per gram. Trivially first-principles from the
 * composition we already resolve, and a table-stakes output for any food engine.
 *
 *   carbohydrate 4 · protein 4 · fat 9 · ethanol 7 kcal·g⁻¹
 *   polyols are lower (sorbitol 2.6, glycerol 4.3) — partially absorbed.
 *
 * Composition is mass % (per 100 g), so energy comes out per 100 g directly.
 *
 * Sources: Atwater general factors; FAO polyol energy values.
 */
import type { Composition } from '../../../types';

/** Atwater energy factors, kcal·g⁻¹. */
export const ATWATER = {
  carbohydrate: 4,
  protein: 4,
  fat: 9,
  ethanol: 7,
  sorbitol: 2.6,
  glycerol: 4.3,
} as const;

const KCAL_TO_KJ = 4.184;

export interface NutritionResult {
  energyKcalPer100g: number;
  energyKJPer100g: number;
  /** Grams per 100 g. */
  carbohydrateG: number;
  proteinG: number;
  fatG: number;
  /** Share of energy from each macro (%). */
  energyFromFatPct: number;
  energyFromCarbPct: number;
  energyFromProteinPct: number;
}

export function computeNutrition(composition: Composition): NutritionResult {
  const sugars =
    (composition.sucrose ?? 0) + (composition.glucose ?? 0) + (composition.fructose ?? 0) +
    (composition.lactose ?? 0) + (composition.maltose ?? 0);
  const sorbitol = composition.sorbitol ?? 0;
  const glycerol = composition.glycerol ?? 0;
  const protein = composition.protein ?? 0;
  const fat = composition.fat ?? 0;
  const ethanol = composition.ethanol ?? 0;

  const kcalCarb = sugars * ATWATER.carbohydrate + sorbitol * ATWATER.sorbitol + glycerol * ATWATER.glycerol;
  const kcalProtein = protein * ATWATER.protein;
  const kcalFat = fat * ATWATER.fat;
  const kcalEthanol = ethanol * ATWATER.ethanol;
  const energyKcalPer100g = kcalCarb + kcalProtein + kcalFat + kcalEthanol;

  const share = (k: number) => (energyKcalPer100g > 0 ? (k / energyKcalPer100g) * 100 : 0);

  return {
    energyKcalPer100g,
    energyKJPer100g: energyKcalPer100g * KCAL_TO_KJ,
    carbohydrateG: sugars + sorbitol + glycerol,
    proteinG: protein,
    fatG: fat,
    energyFromFatPct: share(kcalFat),
    energyFromCarbPct: share(kcalCarb),
    energyFromProteinPct: share(kcalProtein),
  };
}
