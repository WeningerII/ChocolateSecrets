import type { ResolvedIngredient } from '../universal';
import { PAC_FACTORS, POD_FACTORS } from './constants';

/**
 * PAC = Σᵢ (m_i × pac_i) / total_mass
 * where pac_i is the PAC factor for the species (sucrose=100 baseline) and
 * m_i is the species mass in grams. Total mass is the recipe mass.
 *
 * Calibration: 100g of mix containing 25g sucrose + 5g dextrose →
 *   PAC = (25×100 + 5×190) / 100 = 26.5
 * which sits at the bottom of the gelato band.
 */
export function calculatePAC(resolved: ResolvedIngredient[]): number {
  const totalMass = resolved.reduce((s, r) => s + r.mass, 0);
  if (totalMass === 0) return 0;

  let pacSum = 0;
  for (const r of resolved) {
    const c = r.composition;
    pacSum += (c.sucrose ?? 0)  * PAC_FACTORS.sucrose  * r.mass / 100;
    pacSum += (c.glucose ?? 0)  * PAC_FACTORS.glucose  * r.mass / 100;
    pacSum += (c.fructose ?? 0) * PAC_FACTORS.fructose * r.mass / 100;
    pacSum += (c.lactose ?? 0)  * PAC_FACTORS.lactose  * r.mass / 100;
    pacSum += (c.maltose ?? 0)  * PAC_FACTORS.maltose  * r.mass / 100;
    pacSum += (c.sorbitol ?? 0) * PAC_FACTORS.sorbitol * r.mass / 100;
    pacSum += (c.glycerol ?? 0) * PAC_FACTORS.glycerol * r.mass / 100;
    pacSum += (c.ethanol ?? 0)  * PAC_FACTORS.ethanol  * r.mass / 100;
  }
  return pacSum / totalMass;
}

export function calculatePOD(resolved: ResolvedIngredient[]): number {
  const totalMass = resolved.reduce((s, r) => s + r.mass, 0);
  if (totalMass === 0) return 0;

  let podSum = 0;
  for (const r of resolved) {
    const c = r.composition;
    podSum += (c.sucrose ?? 0)  * POD_FACTORS.sucrose  * r.mass / 100;
    podSum += (c.glucose ?? 0)  * POD_FACTORS.glucose  * r.mass / 100;
    podSum += (c.fructose ?? 0) * POD_FACTORS.fructose * r.mass / 100;
    podSum += (c.lactose ?? 0)  * POD_FACTORS.lactose  * r.mass / 100;
    podSum += (c.maltose ?? 0)  * POD_FACTORS.maltose  * r.mass / 100;
    podSum += (c.sorbitol ?? 0) * POD_FACTORS.sorbitol * r.mass / 100;
    podSum += (c.glycerol ?? 0) * POD_FACTORS.glycerol * r.mass / 100;
  }
  return podSum / totalMass;
}

/**
 * Total sugars by mass percentage. Sum of all sugar species in composition.
 * Used both in band checks and in cross-validation against POD.
 */
export function calculateTotalSugarsPct(resolved: ResolvedIngredient[]): number {
  const totalMass = resolved.reduce((s, r) => s + r.mass, 0);
  if (totalMass === 0) return 0;
  let sugarMass = 0;
  for (const r of resolved) {
    const c = r.composition;
    sugarMass += ((c.sucrose ?? 0) + (c.glucose ?? 0) + (c.fructose ?? 0)
                + /* (c.lactose ?? 0) excluded */ (c.maltose ?? 0)) * r.mass / 100;
  }
  return (sugarMass / totalMass) * 100;
}
