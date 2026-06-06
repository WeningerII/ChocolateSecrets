import type { ResolvedIngredient, FatProfileKey } from '../universal';
import { blendSfcAtTemp } from '../universal';
import type { PolymorphWindow, ChocolateClass, ChocolateSnap, ChocolateSnapClass } from './types';

/**
 * Form-V (stable β polymorph) temper windows for chocolate by cocoa percentage.
 * Sources: Hartel, "Crystallization in Foods" (2001); Beckett, "The Science of
 * Chocolate" 3e (2018). Working points are the middle of each window.
 *
 * Anchor table (cocoa% upper bound → window in °C):
 *   30% (white)             → 26.5–28.0 (working 27.3)
 *   35% (milk, low cocoa)   → 28.0–29.5 (working 28.8)
 *   45% (milk, high cocoa)  → 29.0–30.5 (working 29.8)
 *   60% (dark, low cocoa)   → 30.0–31.5 (working 30.8)
 *   75% (dark, mid cocoa)   → 31.0–32.5 (working 31.8)
 *   90% (dark, very high)   → 31.5–33.0 (working 32.3)
 */
const TEMPER_TABLE: Array<{ maxCocoa: number; window: [number, number] }> = [
  { maxCocoa: 30, window: [26.5, 28.0] },
  { maxCocoa: 35, window: [28.0, 29.5] },
  { maxCocoa: 45, window: [29.0, 30.5] },
  { maxCocoa: 60, window: [30.0, 31.5] },
  { maxCocoa: 75, window: [31.0, 32.5] },
  { maxCocoa: 100, window: [31.5, 33.0] },
];

/**
 * Assigns the chocolate class label by cocoa percentage. White chocolate
 * (no cocoa solids) gets cocoaPercentage = the cocoa-butter percentage.
 */
function classify(cocoaPct: number, declared?: ChocolateClass): ChocolateClass {
  if (declared) return declared;
  if (cocoaPct < 25) return 'white';
  if (cocoaPct < 55) return 'milk';
  return 'dark';
}

function lookupWindow(cocoaPct: number): [number, number] {
  for (const row of TEMPER_TABLE) {
    if (cocoaPct <= row.maxCocoa) return row.window;
  }
  return TEMPER_TABLE[TEMPER_TABLE.length - 1].window;
}

/**
 * Returns the polymorph window for the dominant chocolate in a confectionery recipe.
 * "Dominant" = the chocolate ingredient with the largest mass. If there is no
 * chocolate ingredient, returns null.
 *
 * Multiple-chocolate recipes are common (e.g., milk + dark blend); we report the
 * dominant one's window and let the warnings layer flag the multi-class condition.
 */
export function computePolymorphWindow(resolved: ResolvedIngredient[]): PolymorphWindow | null {
  // We need access to the original ingredient docs to read chocolateSpec.
  // The hook layer hands us already-resolved data; the chocolateSpec lives there
  // via the ingredient reference. For Milestone D we'll source cocoa% via a side
  // channel: the hook will set ResolvedIngredient.chocolateCocoaPercentage when
  // building the resolved list (see hook update below).
  //
  // Treat any resolved ingredient whose mass > 0 and which carries a cocoa%
  // payload as a chocolate. The hook fills this in.
  const chocolates = resolved.filter(r => typeof r.chocolateCocoaPercentage === 'number');
  if (chocolates.length === 0) return null;

  const dominant = chocolates.reduce((max, c) => c.mass > max.mass ? c : max, chocolates[0]);
  const cocoaPct = dominant.chocolateCocoaPercentage!;
  const window = lookupWindow(cocoaPct);
  const cls = classify(cocoaPct, dominant.chocolateClass);

  return {
    chocolateClass: cls,
    cocoaPercentage: cocoaPct,
    tempWindowC: window,
    workingPointC: (window[0] + window[1]) / 2,
  };
}

const SNAP_EATING_TEMP_C = 20;

// Class-based cocoa-butter / milk-fat blend. Composition lumps "fat", so the
// milk-fat fraction can't be read directly — these are nominal per-class splits,
// directional only (dark snaps harder than milk). Calibrate if/when a fat-source
// breakdown becomes available.
const SNAP_FAT_BLEND_BY_CLASS: Record<ChocolateClass, Partial<Record<FatProfileKey, number>>> = {
  dark: { cocoa_butter: 1.0 },
  milk: { cocoa_butter: 0.7, milk_fat: 0.3 },
  white: { cocoa_butter: 0.8, milk_fat: 0.2 },
};

/**
 * Estimate chocolate snap from solid fat content at eating temperature. Snap
 * tracks how solid the fat is in the mouth/room: cocoa butter's sharp melt gives
 * dark chocolate its crack, while milk fat softens milk/white. Returns null when
 * no chocolate is present.
 */
export function computeChocolateSnap(resolved: ResolvedIngredient[]): ChocolateSnap | null {
  const chocolates = resolved.filter(r => typeof r.chocolateCocoaPercentage === 'number');
  if (chocolates.length === 0) return null;

  const dominant = chocolates.reduce((max, c) => (c.mass > max.mass ? c : max), chocolates[0]);
  const cls = classify(dominant.chocolateCocoaPercentage!, dominant.chocolateClass);
  const sfc = blendSfcAtTemp(SNAP_FAT_BLEND_BY_CLASS[cls], SNAP_EATING_TEMP_C);
  const snapClass: ChocolateSnapClass = sfc >= 72 ? 'hard_snap' : sfc >= 55 ? 'firm' : 'soft';

  return { chocolateClass: cls, sfcAtEatingTempPct: sfc, eatingTempC: SNAP_EATING_TEMP_C, snapClass };
}

/** Returns true if multiple distinct chocolate classes are present. */
export function detectMixedChocolateClasses(resolved: ResolvedIngredient[]): ChocolateClass[] | null {
  const classes = new Set<ChocolateClass>();
  for (const r of resolved) {
    if (typeof r.chocolateCocoaPercentage === 'number') {
      classes.add(classify(r.chocolateCocoaPercentage, r.chocolateClass));
    }
  }
  return classes.size > 1 ? Array.from(classes) : null;
}
