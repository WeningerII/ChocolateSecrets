/**
 * Glass-transition temperature of the maximally freeze-concentrated serum (Tg′).
 * Below Tg′ molecular mobility effectively halts and recrystallization (iciness
 * growth during storage) stops; the gap between serving/storage temperature and
 * Tg′ governs how fast a product coarsens. This is the storage-stability
 * coordinate that pairs with the freezing curve (the eating-hardness coordinate).
 *
 * v1: mass-weighted mean of per-solute Tg′ over the dissolved sugars/polyols (the
 * serum's glass formers). Tagged as an estimate, NOT first-principles:
 *   - milk proteins / stabilizers raise Tg′ and are not included (massBy carries
 *     only the Norrish solute set), so dairy mixes skew slightly low;
 *   - published Tg′ values carry scatter.
 * v2 hook: Gordon–Taylor mixing with per-solute k constants plus a protein term.
 *
 * Sources: Goff & Hartel, Ice Cream 7e ch. 11; Roos & Karel (1991).
 */
export const TG_PRIME_C: Record<string, number> = {
  sucrose: -32,
  glucose: -43,
  fructose: -42,
  lactose: -28,
  maltose: -30,
  sorbitol: -44,
  glycerol: -65,
};

export type TgPrimeFlag = { kind: 'no_glass_forming_solutes' };

export interface TgPrimeResult {
  /** Estimated Tg′ of the serum, °C. null when there are no glass-forming solutes. */
  tgPrimeC: number | null;
  /** Total mass (g) of glass-forming solutes used in the estimate. */
  soluteMass: number;
  flags: TgPrimeFlag[];
}

/** Estimate Tg′ from aqueous solute masses (the Norrish `massBy` map). */
export function estimateTgPrime(massBy: Record<string, number>): TgPrimeResult {
  let weighted = 0;
  let mass = 0;
  for (const sp of Object.keys(TG_PRIME_C)) {
    const m = massBy[sp] ?? 0;
    if (m > 0) {
      weighted += m * TG_PRIME_C[sp];
      mass += m;
    }
  }
  if (mass <= 0) {
    return { tgPrimeC: null, soluteMass: 0, flags: [{ kind: 'no_glass_forming_solutes' }] };
  }
  return { tgPrimeC: weighted / mass, soluteMass: mass, flags: [] };
}
