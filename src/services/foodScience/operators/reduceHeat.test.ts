import { describe, test, expect } from 'vitest';
import { makeFoodState } from './state';
import { runPipeline } from './pipeline';
import { reduce } from './reduce';
import { heat } from './heat';

describe('reduce operator (evaporative concentration)', () => {
  test('reducing by half removes water and concentrates solutes', () => {
    const s = makeFoodState({ water: 80, sucrose: 20 }, 100, 100);
    const { final } = runPipeline(s, [reduce({ toMassFraction: 0.5 })]);
    expect(final.massG).toBeCloseTo(50, 6);
    expect(final.composition.sucrose!).toBeCloseTo(40, 4); // 20 g in 50 g
    expect(final.composition.water!).toBeCloseTo(60, 4);
    expect(final.markers.concentrationFactor).toBeCloseTo(2, 4);
  });

  test('removeWaterFraction takes that share of the water', () => {
    const s = makeFoodState({ water: 60, sucrose: 40 }, 100);
    const { final } = runPipeline(s, [reduce({ removeWaterFraction: 0.5 })]);
    expect(final.markers.waterRemovedG).toBeCloseTo(30, 4);
    expect(final.massG).toBeCloseTo(70, 4);
  });

  test('cannot remove more water than is present (water-limited)', () => {
    const s = makeFoodState({ water: 30, sucrose: 70 }, 100);
    const { final, logs } = runPipeline(s, [reduce({ toMassFraction: 0.5 })]); // wants to remove 50 g
    expect(final.markers.waterRemovedG).toBeCloseTo(30, 4); // only 30 g water existed
    expect(logs[0].detail.flag).toBe('water_limited');
  });

  test('reductions compose (reduce, then reduce again)', () => {
    const s = makeFoodState({ water: 80, sucrose: 20 }, 100, 100);
    const { final } = runPipeline(s, [reduce({ toMassFraction: 0.5 }), reduce({ toMassFraction: 0.5 })]);
    expect(final.massG).toBeCloseTo(25, 4);
    expect(final.composition.sucrose!).toBeCloseTo(80, 3); // 20 g in 25 g
  });

  // Regression (hardening sweep): ethanol co-evaporates with water (bp 78 °C).
  // Reducing a wine/beer by 50 % must LOWER the ABV, not double it.
  test('reducing a wine/beer co-evaporates ethanol (ABV does not double)', () => {
    const wine = makeFoodState({ water: 87, ethanol: 12, ash: 1 }, 500, 100);
    const { final } = runPipeline(wine, [reduce({ toMassFraction: 0.5 })]);
    // Mass dropped by more than just the water removed (ethanol also left)
    expect(final.massG).toBeLessThan(250 - 0.1); // extra loss beyond 50 % water
    // Ethanol % in the reduced sauce is less than double the starting 12 % (if it simply
    // concentrated like sucrose it would become ~24 %; it should be well under that)
    expect(final.composition.ethanol!).toBeLessThan(20);
    expect(final.markers.ethanolLostG).toBeGreaterThan(0);
  });
});

describe('heat operator (lethality + Maillard browning)', () => {
  const meat = () => makeFoodState({ water: 70, protein: 20, glucose: 2, fat: 8 }, 100, 5);

  test('lethality F is equivalent minutes at 70 °C (z-value, Wolfram-verified)', () => {
    expect(runPipeline(meat(), [heat({ tempC: 70, durationS: 120 })]).final.markers.lethalityF70Min)
      .toBeCloseTo(2, 4);                       // 2 min at 70 °C → F70 = 2
    expect(runPipeline(meat(), [heat({ tempC: 77.5, durationS: 60 })]).final.markers.lethalityF70Min)
      .toBeCloseTo(10, 3);                      // +z (7.5 °C) → 10× lethality
  });

  // Regression (hardening sweep): the z-value model is valid for thermal processing
  // (~55–130 °C). At 200 °C roasting it extrapolated to F70 ≈ 4e18 equiv-min,
  // returned silently. Above the ceiling it must flag and NOT accrue lethality
  // (browning, which IS valid at roasting temps, still accumulates).
  test('lethality is flagged out-of-domain above the z-value validity ceiling', () => {
    const { final, logs } = runPipeline(meat(), [heat({ tempC: 200, durationS: 20 * 60 })]);
    expect(final.markers.lethalityF70Min).toBe(0);          // not 4.3e18
    expect(logs[0].detail.flag).toBe('lethality_out_of_domain');
    expect(final.markers.browningEquivMin180).toBeGreaterThan(0); // browning still valid at 200 °C
  });

  test('lethality accumulates across heat steps', () => {
    const { final } = runPipeline(meat(), [heat({ tempC: 70, durationS: 60 }), heat({ tempC: 70, durationS: 60 })]);
    expect(final.markers.lethalityF70Min).toBeCloseTo(2, 4);
  });

  test('Maillard browning needs both a reducing sugar and protein, and rises with heat', () => {
    const hot = runPipeline(meat(), [heat({ tempC: 180, durationS: 1800 })]).final;   // 30 min @180
    const cool = runPipeline(meat(), [heat({ tempC: 150, durationS: 1800 })]).final;  // 30 min @150
    expect(hot.markers.browningEquivMin180).toBeCloseTo(30, 0);   // k=1 at the 180 °C reference
    expect(cool.markers.browningEquivMin180).toBeLessThan(hot.markers.browningEquivMin180);
    // no protein → no Maillard
    const noProtein = makeFoodState({ water: 50, glucose: 50 }, 100);
    expect(runPipeline(noProtein, [heat({ tempC: 180, durationS: 1800 })]).final.markers.browningEquivMin180)
      .toBe(0);
  });

  test('advances temperature and the clock', () => {
    const { final } = runPipeline(meat(), [heat({ tempC: 180, durationS: 1800 })]);
    expect(final.tempC).toBe(180);
    expect(final.timeS).toBe(1800);
  });
});
