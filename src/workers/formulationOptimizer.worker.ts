/// <reference lib="webworker" />

import type { OptimizerInput, OptimizerResult } from '../types';
import { runFormulationOptimizer, type OptimizerProgressMessage } from '../services/foodScience/optimizer';

export type WorkerInbound = { kind: 'run'; input: OptimizerInput };
export type WorkerOutbound =
  | { kind: 'progress'; payload: OptimizerProgressMessage }
  | { kind: 'done'; payload: OptimizerResult }
  | { kind: 'error'; message: string };

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<WorkerInbound>) => {
  if (event.data.kind !== 'run') return;
  try {
    const result = runFormulationOptimizer(event.data.input, (progress) => {
      self.postMessage({ kind: 'progress', payload: progress } satisfies WorkerOutbound);
    });
    self.postMessage({ kind: 'done', payload: result } satisfies WorkerOutbound);
  } catch (err: unknown) {
    self.postMessage({
      kind: 'error',
      message: err instanceof Error ? err.message : String(err),
    } satisfies WorkerOutbound);
  }
};
