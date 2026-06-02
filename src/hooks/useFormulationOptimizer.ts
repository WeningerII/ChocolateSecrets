import { useCallback, useEffect, useRef, useState } from 'react';
import type { OptimizerInput, OptimizerResult } from '../types';
import type {
  WorkerInbound, WorkerOutbound,
} from '../workers/formulationOptimizer.worker';
import type { OptimizerProgressMessage } from '../services/foodScience/optimizer';

type Status = 'idle' | 'running' | 'done' | 'error';

interface UseFormulationOptimizerReturn {
  status: Status;
  progress: OptimizerProgressMessage | null;
  result: OptimizerResult | null;
  error: string | null;
  run: (input: OptimizerInput) => void;
  cancel: () => void;
}

export function useFormulationOptimizer(): UseFormulationOptimizerReturn {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<OptimizerProgressMessage | null>(null);
  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const cleanupWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanupWorker(), [cleanupWorker]);

  const run = useCallback((input: OptimizerInput) => {
    cleanupWorker();
    setStatus('running');
    setProgress(null);
    setResult(null);
    setError(null);

    const worker = new Worker(
      new URL('../workers/formulationOptimizer.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerOutbound>) => {
      const msg = event.data;
      if (msg.kind === 'progress') setProgress(msg.payload);
      else if (msg.kind === 'done') {
        setResult(msg.payload);
        setStatus('done');
        cleanupWorker();
      } else if (msg.kind === 'error') {
        setError(msg.message);
        setStatus('error');
        cleanupWorker();
      }
    };

    worker.onerror = (e) => {
      setError(e.message);
      setStatus('error');
      cleanupWorker();
    };

    worker.postMessage({ kind: 'run', input } satisfies WorkerInbound);
  }, [cleanupWorker]);

  const cancel = useCallback(() => {
    cleanupWorker();
    setStatus('idle');
  }, [cleanupWorker]);

  return { status, progress, result, error, run, cancel };
}
