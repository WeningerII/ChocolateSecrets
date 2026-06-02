// Single source of truth for the Gemini model identifier on the server.
// Override via the GEMINI_MODEL environment variable to rotate without redeploy.
//
// Rotation procedure (when Google deprecates the current model):
//   1. Read Google's deprecation notice for the successor model name.
//   2. Set the env var: `firebase functions:secrets:set GEMINI_MODEL`
//      (or use `firebase functions:config:set` if your project uses runtime config).
//   3. Redeploy functions only: `firebase deploy --only functions`.
//   4. Watch Cloud Logging for `gemini.canary.ok` with the new model name.
//
// The client-side equivalent in src/constants/gemini.ts will be retired
// once all Gemini calls are server-side. Until then, keep them aligned.
const DEFAULT_MODEL = 'gemini-3.1-pro-preview';

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

// Legacy named export for any code that imports it as a const.
// New code should call getGeminiModel() to pick up env overrides.
export const GEMINI_MODEL = DEFAULT_MODEL;