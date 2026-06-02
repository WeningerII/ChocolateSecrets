import { useState, useEffect, useRef } from 'react';
import { queueTranslation } from '../services/translationClient';
import { SupportedLanguage } from '../types';

export type TranslationStatus = 'pending' | 'success' | 'cached' | 'error';

export interface RuntimeTranslationState {
  text: string;
  status: TranslationStatus;
}

/**
 * Submits a (source, sourceLanguage, targetLanguage) tuple to the batched
 * server-side translator and re-renders with the result. While the request
 * is in flight, the hook returns the source text with status 'pending'.
 *
 * If source and target match, returns the source synchronously with
 * status 'success' — no batch entry is created.
 *
 * On error, returns the source text with status 'error'. Callers (typically
 * <LocalizedField>) surface this with a small ⚠ marker.
 */
export function useRuntimeTranslation(
  source: string,
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage
): RuntimeTranslationState {
  const [state, setState] = useState<RuntimeTranslationState>(() => ({
    text: source,
    status: sourceLanguage === targetLanguage ? 'success' : 'pending',
  }));
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!source) {
      setState({ text: '', status: 'success' });
      return;
    }
    if (sourceLanguage === targetLanguage) {
      setState({ text: source, status: 'success' });
      return;
    }
    setState({ text: source, status: 'pending' });
    queueTranslation(source, sourceLanguage, targetLanguage).then((result) => {
      if (isMounted.current) {
        setState(result);
      }
    });
  }, [source, sourceLanguage, targetLanguage]);

  return state;
}
