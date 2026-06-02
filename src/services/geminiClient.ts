import { GoogleGenAI } from '@google/genai';

let _client: GoogleGenAI | null = null;

/**
 * Returns a lazily-initialized Gemini client. Safe to call from any module.
 * Uses process.env.GEMINI_API_KEY (the environment var). If the key is missing
 * or is the example placeholder, throws a clear error rather than
 * silently constructing a broken client.
 */
export function getGeminiClient(): GoogleGenAI {
  if (_client) return _client;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === '') {
    throw new Error(
      'GEMINI_API_KEY is not configured in the environment.'
    );
  }
  
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

/**
 * Reset the memoized client. Only used in tests where we want a fresh instance.
 */
export function __resetGeminiClient() {
  _client = null;
}
