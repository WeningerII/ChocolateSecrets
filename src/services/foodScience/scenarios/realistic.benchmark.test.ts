import { describe, test, expect } from 'vitest';
import { makeFoodState, runPipeline, ferment } from '../operators';

/**
 * Realistic end-to-end scenarios — recipes + processes with KNOWN real-world
 * outcomes, run through the operator pipeline and checked against literature
 * ranges. These are benchmark/regression coverage: each asserts the physically
 * expected window (not merely whatever the engine currently emits), so a kernel
 * that drifts out of plausibility fails here.
 */

/** Ethanol mass-% (w/w) → ABV (vol-%): × ρ_solution/ρ_ethanol ≈ 1/0.789. */
const abv = (ethanolMassPct: number) => ethanolMassPct / 0.789;

describe('scenario: ale fermentation (12°P wort → ~5–6 % ABV)', () => {
  // Wort modeled as fermentable maltose + unfermentable dextrins (as starch) +
  // water — ~12 °Plato extract, of which ~80 % is fermentable. Real ales from
  // this gravity finish ~5–6.5 % ABV at ~75–82 % apparent attenuation.
  const wort = () => makeFoodState({ water: 88, maltose: 9.5, starch: 2.5 }, 1000, 20);

  test('attenuates to beer-strength ethanol, leaving residual body', () => {
    const { final, logs } = runPipeline(wort(), [
      ferment({ culture: 'ale_yeast', durationS: 7 * 24 * 3600, tempC: 20 }),
    ]);
    const ethanol = final.composition.ethanol ?? 0;
    const residualMaltose = final.composition.maltose ?? 0;
    const co2Lost = final.markers.co2LostG ?? 0;

    expect(abv(ethanol)).toBeGreaterThan(4.3);   // a real ale, not a near-beer
    expect(abv(ethanol)).toBeLessThan(7.5);      // 12°P can't make a barleywine
    expect(residualMaltose).toBeGreaterThan(0);  // dextrins/unfermented body remain
    expect(co2Lost).toBeGreaterThan(30);         // CO₂ escapes (Gay-Lussac ~half the sugar)
    expect(final.massG).toBeLessThan(1000);      // mass lost as CO₂
  });

  test('starch (dextrins) is not fermented', () => {
    const { final } = runPipeline(wort(), [ferment({ culture: 'ale_yeast', durationS: 7 * 24 * 3600, tempC: 20 })]);
    // Starch is not in the fermentable set, so its grams are unchanged; as a % it
    // RISES slightly because total mass fell (CO₂ left).
    expect(final.composition.starch ?? 0).toBeGreaterThan(2.5);
  });
});
