import { describe, test, expect } from 'vitest';
import { topsisRank } from './topsis';
import type { OptimizerObjective, ObjectiveWeights } from '../../../types';

describe('topsisRank', () => {
  test('single row returns 0', () => {
    const rows = [{ objectives: { shelf_life_weeks: 0.5 } as any }];
    const active: OptimizerObjective[] = ['shelf_life_weeks'];
    const res = topsisRank(rows, { shelf_life_weeks: 1 }, active);
    expect(res[0]).toBe(0);
  });

  test('ideal gets 1.0, anti-ideal gets 0.0', () => {
    const rows = [
      { objectives: { shelf_life_weeks: 1.0, cost_per_gram: 1.0 } as any }, // ideal
      { objectives: { shelf_life_weeks: 0.0, cost_per_gram: 0.0 } as any }, // anti-ideal
      { objectives: { shelf_life_weeks: 0.5, cost_per_gram: 0.5 } as any },
    ];
    const active: OptimizerObjective[] = ['shelf_life_weeks', 'cost_per_gram'];
    const weights: ObjectiveWeights = { shelf_life_weeks: 1, cost_per_gram: 1 };
    
    const res = topsisRank(rows, weights, active);
    expect(res[0]).toBe(1.0);
    expect(res[1]).toBe(0.0);
    expect(res[2]).toBeGreaterThan(0);
    expect(res[2]).toBeLessThan(1);
  });
});
