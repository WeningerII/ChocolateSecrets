import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import { GoogleGenAI } from '@google/genai';
import { getFirestore } from 'firebase-admin/firestore';
import { getGeminiModel } from './constants';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const RATE_LIMIT_PER_HOUR = 200;
const HOUR_MS = 60 * 60 * 1000;
const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024; // base64 images are legitimately large

interface GeminiGenerateInput {
  model?: string;
  contents: unknown;
  config?: Record<string, unknown>;
}

/**
 * Server-side proxy for Gemini `generateContent`.
 *
 * Moves GEMINI_API_KEY off the client entirely — it previously shipped inside the
 * browser bundle (vite `define`), exposing a billable key to anyone who loaded the
 * app. Callers keep their prompts and response schemas authoritative on the client;
 * only the transport moves server-side. Auth-gated, per-user rate-limited, and
 * model-/size-constrained so the proxy can't be turned into an open Gemini relay.
 * Returns only the subset of the response the app reads: { text, candidates }.
 */
export const geminiGenerate = onCall(
  { secrets: [GEMINI_API_KEY], region: 'us-central1', maxInstances: 10, timeoutSeconds: 120 },
  async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError('unauthenticated', 'Authentication required');
    const userId = auth.uid;
    const input = (data || {}) as GeminiGenerateInput;

    if (input.contents == null) {
      throw new HttpsError('invalid-argument', 'contents is required');
    }

    // Constrain to Gemini models — never an arbitrary or non-Gemini model.
    const model = typeof input.model === 'string' && input.model ? input.model : getGeminiModel();
    if (!/^gemini-[a-z0-9.\-]+$/i.test(model)) {
      throw new HttpsError('invalid-argument', `Unsupported model: ${model}`);
    }

    if (JSON.stringify(input.contents).length > MAX_PAYLOAD_BYTES) {
      throw new HttpsError('invalid-argument', 'Request payload too large');
    }

    // Per-user hourly rate limit (mirrors extractBill).
    const db = getFirestore();
    const quotaRef = db.collection('userQuotas').doc(userId);
    const now = Date.now();
    await db.runTransaction(async (tx) => {
      const quotaDoc = await tx.get(quotaRef);
      const quota = (quotaDoc.exists && quotaDoc.data()) ? quotaDoc.data()! : {};
      let count = quota.geminiGenerateCount || 0;
      let windowStart = quota.geminiGenerateWindowStart || now;
      if (now - windowStart > HOUR_MS) { count = 0; windowStart = now; }
      if (count >= RATE_LIMIT_PER_HOUR) {
        throw new HttpsError('resource-exhausted', `Rate limit exceeded: ${RATE_LIMIT_PER_HOUR} AI calls per hour`);
      }
      tx.set(quotaRef, { geminiGenerateCount: count + 1, geminiGenerateWindowStart: windowStart }, { merge: true });
    });

    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    let response;
    try {
      response = await client.models.generateContent({
        model,
        contents: input.contents as any,
        config: input.config as any,
      });
    } catch (err: any) {
      logger.error('geminiGenerate call failed', { err: err?.message || String(err), userId, model });
      throw new HttpsError('unavailable', 'AI service is temporarily unavailable. Please try again.');
    }

    return {
      text: response.text ?? '',
      candidates: response.candidates ?? [],
    };
  }
);
