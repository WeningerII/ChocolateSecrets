import { describe, test, expect } from 'vitest';
import { OPERATORS, defaultParams, PRESETS } from './PipelinePanel';
import { makeFoodState, runPipeline } from '../services/foodScience/operators';

const OP_BY_ID = Object.fromEntries(OPERATORS.map(o => [o.id, o]));

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

describe('PipelinePanel example presets', () => {
  const start = () => makeFoodState({ water: 55, sucrose: 25, fat: 12, protein: 4, ash: 2, lactose: 2 }, 1000, 20);

  test('every preset references real operators and runs end-to-end', () => {
    expect(PRESETS.length).toBeGreaterThan(0);
    for (const preset of PRESETS) {
      expect(preset.steps.length).toBeGreaterThan(0);
      const ops = preset.steps.map(s => {
        const op = OP_BY_ID[s.opId];
        expect(op, `preset ${preset.key} → unknown op ${s.opId}`).toBeTruthy();
        return op.make({ ...defaultParams(op), ...(s.params ?? {}) });
      });
      const { final, logs } = runPipeline(start(), ops);
      expect(logs.length).toBe(preset.steps.length);
      expect(Number.isFinite(final.massG)).toBe(true);
      expect(Number.isFinite(final.tempC)).toBe(true);
    }
  });

  test('preset param overrides only use keys the operator declares', () => {
    for (const preset of PRESETS) {
      for (const s of preset.steps) {
        const declared = new Set(OP_BY_ID[s.opId].fields.map(f => f.key));
        for (const k of Object.keys(s.params ?? {})) {
          expect(declared.has(k), `preset ${preset.key} → ${s.opId} has stray param ${k}`).toBe(true);
        }
      }
    }
  });
});
