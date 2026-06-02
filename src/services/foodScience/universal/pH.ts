import type { ResolvedIngredient, PHResult, PHFlag } from './types';

export const CASEIN_ISOELECTRIC_PH = 4.6;

export interface BufferComponent {
  naturalPH: number;
  acids: Array<{ conc: number; pKa: number[] }>;
  counterion: number;     // computed at module init via calibrateCounterion
}

/**
 * Buffer reference data. Concentrations in mol/L. pKa values reflect 25 °C aqueous.
 * Counterion charges are computed at module init from each entry's natural pH so that
 * the entry alone solves to its declared natural pH.
 *
 * Sources: Walstra Dairy Science (cream), Boiron technical sheets (purees),
 * USDA composition database (honey gluconic acid).
 */
export const BUFFER_REFERENCES: Record<string, BufferComponent> = {
  'cream': {
    naturalPH: 6.6,
    acids: [
      { conc: 0.020, pKa: [2.15, 7.20, 12.35] },     // phosphate
      { conc: 0.005, pKa: [3.13, 4.76, 6.40] },      // citrate
    ],
    counterion: 0,
  },
  'puree.raspberry': {
    naturalPH: 3.2,
    acids: [
      { conc: 0.064, pKa: [3.13, 4.76, 6.40] },      // citric
      { conc: 0.026, pKa: [3.40, 5.05] },            // malic
    ],
    counterion: 0,
  },
  'puree.passion': {
    naturalPH: 2.9,
    acids: [{ conc: 0.200, pKa: [3.13, 4.76, 6.40] }],
    counterion: 0,
  },
  'puree.mango': {
    naturalPH: 4.5,
    acids: [
      { conc: 0.022, pKa: [3.13, 4.76, 6.40] },
      { conc: 0.013, pKa: [3.40, 5.05] },
    ],
    counterion: 0,
  },
  'puree.strawberry': {
    naturalPH: 3.4,
    acids: [
      { conc: 0.049, pKa: [3.13, 4.76, 6.40] },
      { conc: 0.012, pKa: [3.40, 5.05] },
    ],
    counterion: 0,
  },
  'puree.pear': {
    naturalPH: 4.0,
    acids: [
      { conc: 0.024, pKa: [3.40, 5.05] },
      { conc: 0.002, pKa: [3.13, 4.76, 6.40] },
    ],
    counterion: 0,
  },
  'puree.apricot': {
    naturalPH: 3.6,
    acids: [
      { conc: 0.109, pKa: [3.40, 5.05] },
      { conc: 0.008, pKa: [3.13, 4.76, 6.40] },
    ],
    counterion: 0,
  },
  'honey': {
    naturalPH: 3.9,
    acids: [{ conc: 0.150, pKa: [3.86] }],            // gluconic
    counterion: 0,
  },
};

/**
 * Polyprotic α-fraction calculation. For an n-protic acid at given pH, returns
 * the fraction of each species [α₀, α₁, ..., αₙ] where index i = species with i protons lost.
 */
export function alphaPolyprotic(pH: number, pKas: number[]): number[] {
  const h = Math.pow(10, -pH);
  const Ks = pKas.map(p => Math.pow(10, -p));
  const n = Ks.length;
  const nums = [Math.pow(h, n)];
  let prod = 1;
  for (let i = 0; i < n; i++) {
    prod *= Ks[i];
    nums.push(Math.pow(h, n - 1 - i) * prod);
  }
  const denom = nums.reduce((a, b) => a + b, 0);
  return nums.map(x => x / denom);
}

/** Negative charge contribution per acid at given pH. */
function negativeChargeFromAcid(acid: { conc: number; pKa: number[] }, pH: number): number {
  const alphas = alphaPolyprotic(pH, acid.pKa);
  let sum = 0;
  for (let i = 1; i < alphas.length; i++) sum += i * alphas[i];
  return acid.conc * sum;
}

/**
 * Solve for the counterion charge required for a buffer to land at its declared natural pH alone.
 * Required because pH-data acid concentrations are reported on the acid-anion basis but real
 * food contains balancing cations (K⁺, Ca²⁺, Na⁺); we lump them as a single counterion.
 */
export function calibrateCounterion(component: BufferComponent): number {
  let neg = 0;
  for (const acid of component.acids) neg += negativeChargeFromAcid(acid, component.naturalPH);
  const h = Math.pow(10, -component.naturalPH);
  const oh = 1e-14 / h;
  return neg + oh - h;
}

// Module-init: calibrate every reference's counterion charge. Mutating a const-keyed
// object at module load is a deliberate one-time exception to immutability.
for (const key of Object.keys(BUFFER_REFERENCES)) {
  BUFFER_REFERENCES[key].counterion = calibrateCounterion(BUFFER_REFERENCES[key]);
}

interface PhMixture {
  acids: Array<{ conc: number; pKa: number[] }>;
  counterion: number;
  totalWater: number;
}

function buildPhMixture(components: Array<{ bufferRef: string; comp: BufferComponent; waterMass: number }>): PhMixture | null {
  const totalWater = components.reduce((s, c) => s + c.waterMass, 0);
  if (totalWater === 0) return null;
  const acids: PhMixture['acids'] = [];
  let counterion = 0;
  for (const { comp, waterMass } of components) {
    const fraction = waterMass / totalWater;
    for (const acid of comp.acids) acids.push({ conc: acid.conc * fraction, pKa: acid.pKa });
    counterion += comp.counterion * fraction;
  }
  return { acids, counterion, totalWater };
}

function solvePH(mix: PhMixture): number {
  let lo = 1.0, hi = 13.0;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const h = Math.pow(10, -mid);
    const oh = 1e-14 / h;
    let charge = h - oh + mix.counterion;
    for (const acid of mix.acids) charge -= negativeChargeFromAcid(acid, mid);
    if (charge > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Calculate mixed-system pH from a list of resolved ingredients.
 * Only ingredients with a recognized bufferRef contribute to the pH calculation.
 * Returns null if no ingredient resolves to a buffer reference.
 */
export function calculateMixedPH(ingredients: ResolvedIngredient[]): PHResult | null {
  const flags: PHFlag[] = [];
  const components: Array<{ bufferRef: string; comp: BufferComponent; waterMass: number }> = [];

  for (const ing of ingredients) {
    if (!ing.bufferRef) continue;
    const comp = BUFFER_REFERENCES[ing.bufferRef];
    if (!comp) {
      flags.push({ kind: 'unrecognized_buffer_source', ingredientId: ing.ingredientId });
      continue;
    }
    const waterMass = ing.mass * (ing.composition.water ?? 0) / 100;
    if (waterMass > 0) {
      components.push({ bufferRef: ing.bufferRef, comp, waterMass });
    }
  }

  if (components.length === 0) {
    flags.push({ kind: 'no_buffer_data' });
    return null;
  }

  const mix = buildPhMixture(components);
  if (!mix) return null;

  const pH = solvePH(mix);
  if (pH < 4.0) flags.push({ kind: 'mixed_system_acidic', pH });

  return {
    pH,
    components: components.map(c => ({
      bufferRef: c.bufferRef,
      waterMass: c.waterMass,
      fraction: c.waterMass / mix.totalWater,
    })),
    flags,
  };
}
