/**
 * Solid fat content (SFC) vs temperature — the "how solid is the fat right now"
 * curve behind chocolate snap and fat-driven hardness. Table-based: per-fat SFC
 * profiles (literature dilatometry / pNMR), linearly interpolated and blended by
 * mass fraction.
 *
 * Tagged calibrated/table — NOT first-principles (true SFC needs TAG melting
 * thermodynamics + polymorph state). Sources: Beckett, "The Science of Chocolate"
 * 3e (2018); Hartel, "Crystallization in Foods" (2001).
 */
export type FatProfileKey = 'cocoa_butter' | 'milk_fat' | 'coconut_oil';

/** [tempC, SFC%] anchor points for a well-crystallized fat, ascending in temp. */
export const FAT_MELTING_PROFILES: Record<FatProfileKey, Array<[number, number]>> = {
  // Cocoa butter — sharp melt around 32–34 °C (the snap + cool melt of chocolate).
  cocoa_butter: [[0, 100], [10, 96], [20, 82], [25, 72], [27, 62], [30, 45], [32, 24], [34, 5], [36, 0]],
  // Milk fat — broad melt range, soft at room temp (softens milk chocolate).
  milk_fat: [[0, 72], [5, 54], [10, 45], [15, 34], [20, 22], [25, 12], [30, 6], [35, 2], [37, 0]],
  // Coconut oil — very sharp melt around 24 °C.
  coconut_oil: [[0, 90], [15, 75], [20, 55], [22, 35], [24, 10], [26, 0]],
};

/** Solid fat content (%) of a single fat at a temperature, linearly interpolated. */
export function sfcAtTemp(profile: FatProfileKey, tempC: number): number {
  const pts = FAT_MELTING_PROFILES[profile];
  if (tempC <= pts[0][0]) return pts[0][1];
  if (tempC >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, s0] = pts[i];
    const [t1, s1] = pts[i + 1];
    if (tempC >= t0 && tempC <= t1) {
      const f = (tempC - t0) / (t1 - t0);
      return s0 + f * (s1 - s0);
    }
  }
  return pts[pts.length - 1][1];
}

/** Mass-weighted SFC (%) of a blend of fats at a temperature. */
export function blendSfcAtTemp(blend: Partial<Record<FatProfileKey, number>>, tempC: number): number {
  let total = 0;
  let weighted = 0;
  for (const k of Object.keys(blend) as FatProfileKey[]) {
    const w = blend[k] ?? 0;
    if (w > 0) {
      weighted += w * sfcAtTemp(k, tempC);
      total += w;
    }
  }
  return total > 0 ? weighted / total : 0;
}
