import { describe, test, expect } from 'vitest';
import { OPERATORS, defaultParams } from './PipelinePanel';
import { makeFoodState, runPipeline } from '../services/foodScience/operators';

// Guards the UI registry: each entry's make() must accept its own default params
// and produce a runnable operator, so a param/units mismatch can't ship silently.
describe('PipelinePanel operator registry', () => {
  const start = () => makeFoodState({ water: 60, sucrose: 20, fat: 10, protein: 5, ash: 3, lactose: 2 }, 1000, 20);

  test('every operator builds from its defaults and runs to a finite state', () => {
    for (const op of OPERATORS) {
      const { final, logs } = runPipeline(start(), [op.make(defaultParams(op))]);
      expect(logs[0].operator).toBeTruthy();
      expect(Number.isFinite(final.massG)).toBe(true);
      expect(Number.isFinite(final.tempC)).toBe(true);
      expect(final.massG).toBeGreaterThanOrEqual(0);
    }
  });

  test('the whole registry chains into one pipeline without throwing', () => {
    const ops = OPERATORS.map(op => op.make(defaultParams(op)));
    const { final, trajectory, logs } = runPipeline(start(), ops);
    expect(logs.length).toBe(OPERATORS.length);
    expect(trajectory.length).toBe(OPERATORS.length + 1);
    expect(Number.isFinite(final.massG)).toBe(true);
    expect(Number.isFinite(final.tempC)).toBe(true);
  });

  test('registry ids are unique', () => {
    const ids = OPERATORS.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
