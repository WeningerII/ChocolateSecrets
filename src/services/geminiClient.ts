import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export interface GeminiGenerateRequest {
  model?: string;
  contents: unknown;
  config?: unknown;
}

export interface GeminiGenerateResponse {
  text: string;
  candidates?: any[];
}

const callGeminiGenerate = httpsCallable<GeminiGenerateRequest, GeminiGenerateResponse>(
  functions,
  'geminiGenerate',
);

/**
 * Returns a Gemini client whose `generateContent` proxies through the
 * `geminiGenerate` Cloud Function. The GEMINI_API_KEY lives only on the server and
 * is no longer bundled into the browser. The returned shape mirrors the subset of
 * `@google/genai` the app uses — request `{ model, contents, config }`, response
 * `{ text, candidates }` — so existing callers need no changes.
 */
export function getGeminiClient() {
  return {
    models: {
      generateContent: async (req: GeminiGenerateRequest): Promise<GeminiGenerateResponse> => {
        const res = await callGeminiGenerate(req);
        return res.data;
      },
    },
  };
}

/** Retained as a no-op for backward compatibility with older test imports. */
export function __resetGeminiClient() {
  /* no in-browser client to reset now that calls are proxied server-side */
}
