/**
 * The pipeline — composition of unit operators. An Operator is a pure
 * state → {state, log} function; a recipe-as-program is just a list of them, run
 * left to right with the state threaded through. This is the "instruction set":
 * new capabilities are new operators, and any sequence is a valid program.
 *
 *   runPipeline(makeFoodState(comp, mass), [
 *     ferment({ culture: 'ale_yeast', durationS: 7200, tempC: 22 }),
 *     ferment({ culture: 'ale_yeast', durationS: 43200, tempC: 18 }),
 *   ])
 *
 * It returns the final state, the full trajectory (state after each step, for a
 * timeline/plot), and a structured log of what each operator did.
 */
import type { FoodState } from './state';

export interface StepLog {
  operator: string;
  detail: Record<string, number | string>;
}

export type Operator = (state: FoodState) => { state: FoodState; log: StepLog };

export interface PipelineResult {
  final: FoodState;
  /** State before the first op, then after each op (length = ops + 1). */
  trajectory: FoodState[];
  logs: StepLog[];
}

export function runPipeline(initial: FoodState, operators: Operator[]): PipelineResult {
  const trajectory: FoodState[] = [initial];
  const logs: StepLog[] = [];
  let state = initial;
  for (const op of operators) {
    const result = op(state);
    state = result.state;
    trajectory.push(state);
    logs.push(result.log);
  }
  return { final: state, trajectory, logs };
}
