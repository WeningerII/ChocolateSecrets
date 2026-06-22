import { describe, test, expect } from 'vitest';
import { buildProcessProfile, profileFromSegments } from './profile';
import type { RecipeStep } from '../../../types';

function step(partial: Partial<RecipeStep> & { order: number }): RecipeStep {
  return {
    id: `s${partial.order}`,
    title: `step ${partial.order}`,
    actionType: 'bake',
    equipment: [],
    instruction: '',
    ...partial,
  };
}

describe('buildProcessProfile', () => {
  test('includes only steps that carry both a temperature and a positive duration', () => {
    const steps: RecipeStep[] = [
      step({ order: 1, parameters: { temperatureTarget: 180, durationSeconds: 1200 } }),
      step({ order: 2, parameters: { durationSeconds: 600 } }),               // no temp -> skip
      step({ order: 3, parameters: { temperatureTarget: 200 } }),             // no duration -> skip
      step({ order: 4, parameters: { temperatureTarget: 160, durationSeconds: 0 } }), // zero -> skip
    ];
    const profile = buildProcessProfile(steps);
    expect(profile.segments).toHaveLength(1);
    expect(profile.segments[0]).toMatchObject({ tempC: 180, durationS: 1200 });
    expect(profile.totalDurationS).toBe(1200);
  });

  test('reads steps in `order`, not array order', () => {
    const steps: RecipeStep[] = [
      step({ order: 2, parameters: { temperatureTarget: 200, durationSeconds: 300 } }),
      step({ order: 1, parameters: { temperatureTarget: 100, durationSeconds: 300 } }),
    ];
    const profile = buildProcessProfile(steps);
    expect(profile.segments.map((s) => s.tempC)).toEqual([100, 200]);
    expect(profile.totalDurationS).toBe(600);
  });

  test('is empty when no step carries thermal data', () => {
    const profile = buildProcessProfile([step({ order: 1 })]);
    expect(profile.segments).toHaveLength(0);
    expect(profile.totalDurationS).toBe(0);
  });
});

describe('profileFromSegments', () => {
  test('keeps positive-duration segments and totals them', () => {
    const profile = profileFromSegments([
      { tempC: 20, durationS: 86_400 },
      { tempC: 25, durationS: 0 }, // dropped
    ]);
    expect(profile.segments).toHaveLength(1);
    expect(profile.totalDurationS).toBe(86_400);
  });
});
