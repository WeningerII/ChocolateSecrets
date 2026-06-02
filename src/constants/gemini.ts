// @deprecated — only consulted while client-side Gemini calls remain.
// The canonical model identifier lives in functions/src/constants.ts and
// is overridable via the GEMINI_MODEL env var on Cloud Functions.
// Migrate remaining client-side Gemini calls to Cloud Functions, then delete this file.
//
// Single source of truth for the Gemini model identifier on the client.
// The server-side equivalent lives in functions/src/constants.ts and
// MUST be kept in sync with this file.
export const GEMINI_MODEL = 'gemini-3.1-pro-preview';
