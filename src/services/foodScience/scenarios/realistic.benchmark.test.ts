import { describe, test, expect } from 'vitest';
import { makeFoodState, runPipeline, ferment, reduce, brine, aerate, freeze, dehydrate } from '../operators';
import { computeBoilingPoint, classifyCandyStage } from '../universal';
import { computeTasteProfile } from '../perception';

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

describe('scenario: boiling sugar syrup to candy stages', () => {
  // Boil a 50/50 sugar syrup down. Confectioners read concentration off a
  // thermometer via the candy-stage table; the colligative boiling-point kernel
  // is only valid while dilute, and must flag the candy regime rather than emit
  // an impossible temperature (ideal van 't Hoff → ~248 °C at 99 % sugar).
  test('reducing concentrates the syrup toward the candy regime', () => {
    const syrup = makeFoodState({ water: 50, sucrose: 50 }, 200, 110);
    const { final } = runPipeline(syrup, [reduce({ removeWaterFraction: 0.9, tempC: 130 })]);
    expect(final.composition.sucrose!).toBeGreaterThan(85); // concentrated
    expect((final.composition.water ?? 0)).toBeLessThan(15);
  });

  test('the boiling-point kernel flags the candy regime instead of trusting it', () => {
    const dilute = computeBoilingPoint({ water: 80, sucrose: 20 });
    expect(dilute.flags).toHaveLength(0);
    expect(dilute.boilingPointC!).toBeLessThan(102); // physical, dilute

    const hardCrack = computeBoilingPoint({ water: 1.5, sucrose: 98.5 });
    expect(hardCrack.flags.some(f => f.kind === 'beyond_dilute_limit')).toBe(true);
  });

  test('candy-stage thermometer lookups match the confectioner table', () => {
    expect(classifyCandyStage(114)).toBe('soft_ball');   // fudge/fondant ~112–116 °C
    expect(classifyCandyStage(150)).toBe('hard_crack');  // brittle/lollipop ~146–154 °C
    expect(classifyCandyStage(168)).toBe('caramel');     // browning > 160 °C
  });
});

describe('scenario: wet-brining a pork loin (6 % brine, 24 h)', () => {
  // A 2 cm-thick lean loin (half-thickness 1 cm) in a 6 % salt brine for a day.
  // Real wet brines at this strength/time leave roughly 0.5–2 % salt (NaCl) in
  // the meat — seasoned, not cured-salty.
  const loin = () => makeFoodState({ water: 72, protein: 21, fat: 6, ash: 1 }, 1000, 5);

  test('takes up a plausible amount of salt without over-curing', () => {
    const { final } = runPipeline(loin(), [
      brine({ solute: 'salt', bathConcentrationPct: 6, geometry: 'slab', characteristicLengthM: 0.01, durationS: 24 * 3600 }),
    ]);
    const naCl = (final.composition.sodium ?? 0) / 0.3934; // back out NaCl from its sodium

    expect(naCl).toBeGreaterThan(0.4);   // it did season
    expect(naCl).toBeLessThan(3);        // a day's wet brine isn't dry-cure salty
    expect(final.composition.sodium!).toBeLessThanOrEqual(final.composition.ash! + 1e-9); // Na ⊆ ash invariant
    expect(final.massG).toBeGreaterThan(1000); // gained the absorbed salt
  });

  test('longer brining drives more salt in (monotone)', () => {
    const short = runPipeline(loin(), [brine({ solute: 'salt', bathConcentrationPct: 6, geometry: 'slab', characteristicLengthM: 0.01, durationS: 12 * 3600 })]).final;
    const long = runPipeline(loin(), [brine({ solute: 'salt', bathConcentrationPct: 6, geometry: 'slab', characteristicLengthM: 0.01, durationS: 48 * 3600 })]).final;
    expect(long.composition.sodium!).toBeGreaterThan(short.composition.sodium!);
  });
});

describe('scenario: whipping cream', () => {
  // Heavy cream (~36 % fat) whips to a fat-stabilized foam. Real whipped cream
  // reaches ~100 % overrun (doubles in volume) — density roughly halves — and
  // can't be pushed indefinitely; skim milk barely whips at all.
  const cream = () => makeFoodState({ water: 58, fat: 36, protein: 2, lactose: 3, ash: 1 }, 500, 4);

  test('whips to a plausible overrun and roughly halves the density', () => {
    const { final } = runPipeline(cream(), [aerate({ targetOverrunPct: 150 })]);
    expect(final.markers.overrunPct).toBeGreaterThan(75);   // it whipped
    expect(final.markers.overrunPct).toBeLessThanOrEqual(150);
    // density factor is the reciprocal of the volume expansion
    expect(final.markers.densityFactor).toBeCloseTo(1 / (1 + final.markers.overrunPct / 100), 6);
    expect(final.markers.densityFactor).toBeLessThan(0.6); // whipped cream floats
    expect(final.massG).toBe(500);                          // air is ~weightless
  });

  // NOTE: aerate models overrun CAPABILITY, not foam stability/permanence. Skim
  // milk actually froths heavily (barista microfoam) — the model rightly gives it
  // a high overrun; what separates it from cream is that its foam drains fast,
  // which this operator does not surface. So the clean "won't aerate" control is a
  // liquid with neither foaming protein nor whippable fat: plain water.
  test('plain water cannot hold a foam (the true non-aerating control)', () => {
    const { final, logs } = runPipeline(makeFoodState({ water: 100 }, 500, 4), [
      aerate({ targetOverrunPct: 100 }),
    ]);
    expect(final.markers.overrunPct).toBe(0);
    expect(logs[0].detail.flag).toBe('cannot_aerate');
  });
});

describe('scenario: hardening ice cream to freezer temperature', () => {
  // A standard ice-cream mix blast-frozen to −18 °C. Real mixes freeze around
  // −2.5 to −3 °C and reach a high (but not complete) ice fraction at the freezer.
  const mix = () => makeFoodState({ water: 60, sucrose: 15, glucose: 4, lactose: 6, fat: 10, protein: 4, ash: 1 }, 1000, 4);

  test('freezing point, ice fraction and time are physical', () => {
    const { final } = runPipeline(mix(), [
      freeze({ geometry: 'sphere', characteristicDimensionM: 0.04, mediumTempC: -25, surfaceCoeffWm2K: 20, targetTempC: -18 }),
    ]);
    expect(final.markers.freezingPointC).toBeGreaterThan(-3.5); // sub-zero, ice-cream range
    expect(final.markers.freezingPointC).toBeLessThan(-1.5);
    expect(final.markers.iceFractionAtTarget).toBeGreaterThan(0.6); // mostly frozen at −18
    expect(final.markers.iceFractionAtTarget).toBeLessThan(0.95);   // never fully frozen (solutes)
    expect(final.markers.freezingTimeS).toBeGreaterThan(0);
    expect(final.tempC).toBe(-18);
  });

  test('colder serving holds more ice (monotone)', () => {
    const soft = runPipeline(mix(), [freeze({ geometry: 'sphere', characteristicDimensionM: 0.04, mediumTempC: -25, surfaceCoeffWm2K: 20, targetTempC: -11 })]).final;
    const hard = runPipeline(mix(), [freeze({ geometry: 'sphere', characteristicDimensionM: 0.04, mediumTempC: -25, surfaceCoeffWm2K: 20, targetTempC: -18 })]).final;
    expect(hard.markers.iceFractionAtTarget).toBeGreaterThan(soft.markers.iceFractionAtTarget);
  });

  test('the freezer-temp ice fraction is flagged as past the ideal-colligative limit', () => {
    // At −18 °C the unfrozen serum is ~¾ sugar — far past dilute — so the ideal
    // curve over-predicts ice. The operator flags this; at soft-serve temp it does not.
    const hard = runPipeline(mix(), [freeze({ geometry: 'sphere', characteristicDimensionM: 0.04, mediumTempC: -25, surfaceCoeffWm2K: 20, targetTempC: -18 })]).final;
    expect(hard.markers.iceFractionBeyondIdeal).toBe(1);
    expect(hard.markers.serumSoluteFractionAtTarget).toBeGreaterThan(0.66);

    const soft = runPipeline(mix(), [freeze({ geometry: 'sphere', characteristicDimensionM: 0.04, mediumTempC: -25, surfaceCoeffWm2K: 20, targetTempC: -6 })]).final;
    expect(soft.markers.iceFractionBeyondIdeal).toBe(0);
  });
});

describe('scenario: culturing milk into yogurt', () => {
  // Whole milk incubated at ~43 °C with thermophilic LAB. Real yogurt finishes at
  // ~0.7–1 % lactic acid (titratable acidity) and ~pH 4.5 — tangy, not lemon-sour —
  // and still holds most of its lactose (yogurt is not lactose-free).
  const milk = () => makeFoodState({ water: 87.5, lactose: 4.8, fat: 3.5, protein: 3.4, ash: 0.8 }, 1000, 43);

  test('develops yogurt-strength acidity, leaving most lactose behind', () => {
    const { final } = runPipeline(milk(), [ferment({ culture: 'yogurt_lactic', durationS: 6 * 3600, tempC: 43 })]);
    expect(final.composition.lacticAcid!).toBeGreaterThan(0.5);
    expect(final.composition.lacticAcid!).toBeLessThan(1.3); // tangy, not ~4 %
    expect(final.composition.lactose!).toBeGreaterThan(3.5); // most lactose remains
  });

  test('the sour note rises from milk to yogurt but does not max out', () => {
    const before = computeTasteProfile(milk().composition, null).sour;
    const after = computeTasteProfile(
      runPipeline(milk(), [ferment({ culture: 'yogurt_lactic', durationS: 6 * 3600, tempC: 43 })]).final.composition,
      null,
    ).sour;
    expect(after).toBeGreaterThan(before);  // it soured
    expect(after).toBeLessThan(65);         // tangy, not battery-acid (the old bug read ~83)
  });
});

describe('scenario: drying beef into jerky', () => {
  // Lean beef strips in a 65 °C / 20 % RH dehydrator. While the surface is wet it
  // sits at the wet bulb (evaporative cooling, well below the air), losing water at
  // a steady flux; the meat concentrates as it dries.
  const beef = () => makeFoodState({ water: 74, protein: 22, fat: 3, ash: 1 }, 1000, 20);

  test('constant-rate drying removes water, cools to the wet bulb, and concentrates the meat', () => {
    const { final, logs } = runPipeline(beef(), [
      dehydrate({ airTempC: 65, relativeHumidity: 0.2, surfaceCoeffWm2K: 25, surfaceAreaM2: 0.08, durationS: 4 * 3600 }),
    ]);
    expect(final.markers.waterRemovedG).toBeGreaterThan(250);
    expect(final.massG).toBeLessThan(1000);
    expect(final.markers.concentrationFactor).toBeGreaterThan(1);
    expect(final.composition.protein!).toBeGreaterThan(22);     // concentrated
    // Wet-bulb evaporative cooling: surface well below the 65 °C air.
    expect(final.tempC).toBeCloseTo(final.markers.dryingWetBulbC, 6);
    expect(final.tempC).toBeGreaterThan(30);
    expect(final.tempC).toBeLessThan(50);
    expect(logs[0].detail.flag).toBeUndefined();                // still in the constant-rate regime
  });

  test('drying long enough exhausts the free water (constant-rate model caps there)', () => {
    const { final, logs } = runPipeline(beef(), [
      dehydrate({ airTempC: 65, relativeHumidity: 0.2, surfaceCoeffWm2K: 25, surfaceAreaM2: 0.08, durationS: 24 * 3600 }),
    ]);
    expect(logs[0].detail.flag).toBe('water_limited');
    expect(final.composition.water ?? 0).toBe(0); // constant-rate model has no falling-rate residual
  });
});

describe('scenario: whipping egg whites to meringue', () => {
  // Egg white is ~11 % foaming protein and no fat — the classic high-overrun foam.
  // It whips far past whipped cream and lands very light (a stiff meringue is mostly
  // air), where a fat-stabilized cream foam tops out much lower.
  test('egg white whips to a large, light foam — well beyond cream', () => {
    const egg = runPipeline(makeFoodState({ water: 88, protein: 11, ash: 1 }, 200, 20), [aerate({ targetOverrunPct: 400 })]);
    const cream = runPipeline(makeFoodState({ water: 58, fat: 36, protein: 2, lactose: 3, ash: 1 }, 200, 4), [aerate({ targetOverrunPct: 400 })]);

    expect(egg.final.markers.overrunPct).toBeGreaterThan(200);                 // a real meringue
    expect(egg.final.markers.densityFactor).toBeLessThan(0.4);                 // mostly air
    expect(egg.final.markers.overrunPct).toBeGreaterThan(cream.final.markers.overrunPct); // protein foam > fat foam
    expect(egg.logs[0].detail.flag).toBe('aeration_limited');                  // can't whip past its ceiling
    expect(egg.final.massG).toBe(200);                                         // air is ~weightless
  });
});
