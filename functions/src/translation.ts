import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import { GoogleGenAI, Type } from '@google/genai';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { getGeminiModel } from './constants';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

export function isModelGoneError(err: any): boolean {
  const status = err?.status ?? err?.httpStatusCode ?? err?.code;
  return (
    status === 404 ||
    /not found|does not exist|deprecated|has been shut down|no longer available/i.test(err?.message || '')
  );
}

// One-shot boot canary: on the first invocation per cold start, fire a
// trivial generateContent against the current model and log the result.
// Catches model deprecations within seconds of any deploy or rotation.
let canaryDone = false;
async function modelCanary() {
  if (canaryDone) return;
  canaryDone = true;
  try {
    const client = new GoogleGenAI({ apiKey: resolveGeminiApiKey() });
    await client.models.generateContent({
      model: getGeminiModel(),
      contents: 'ping',
    });
    logger.info('gemini.canary.ok', { model: getGeminiModel() });
  } catch (err: any) {
    logger.error('gemini.canary.failed', {
      model: getGeminiModel(),
      status: err?.status ?? err?.code,
      error: err instanceof Error ? err.message : String(err),
    });
    // Do not rethrow — the user's actual request handles its own errors.
    // The canary's job is to leave a signal in Cloud Logging, nothing more.
  }
}

type Lang = 'en' | 'es' | 'ko';

const LANGUAGE_NAMES: Record<Lang, string> = {
  en: 'English',
  es: 'Spanish',
  ko: 'Korean',
};

const RATE_LIMIT_PER_HOUR = 5000;
const HOUR_MS = 60 * 60 * 1000;

interface TranslateRequest {
  texts: string[];
  sourceLanguage: Lang;
  targetLanguage: Lang;
  firestoreDatabaseId?: string;
}

interface TranslationResult {
  text: string;
  status: 'success' | 'cached' | 'error';
}

interface TranslateResponse {
  translations: TranslationResult[];
  cacheHits: number;
  geminiCalls: number;
}

/**
 * Resolve the Gemini API key with the following priority:
 *
 *   1. Secret Manager (canonical production path, set via
 *      `firebase functions:secrets:set GEMINI_API_KEY`).
 *   2. process.env.GEMINI_API_KEY (local emulator and AI Studio
 *      preview environments where Secret Manager is unavailable).
 *   3. Throw a clear HttpsError. The client surfaces this as
 *      'failed-precondition' instead of 'internal', so the actual
 *      cause is visible in the browser console without diving into
 *      Cloud Functions logs.
 */
function resolveGeminiApiKey(): string {
  // Try Secret Manager first. .value() throws if the secret isn't bound
  // (preview environments, missing configuration). Catch and fall through.
  try {
    const fromSecret = GEMINI_API_KEY.value();
    if (fromSecret) return fromSecret;
  } catch {
    // Secret not bound — fall through to env var.
  }

  const fromEnv = process.env.GEMINI_API_KEY;
  if (fromEnv) return fromEnv;

  throw new HttpsError(
    'failed-precondition',
    'GEMINI_API_KEY not configured. Set the Secret Manager secret via `firebase functions:secrets:set GEMINI_API_KEY` for production, or set process.env.GEMINI_API_KEY for local development.'
  );
}

export const translateBatch = onCall<TranslateRequest, Promise<TranslateResponse>>(
  { region: 'us-central1', maxInstances: 10 },
  async (request) => {
    void modelCanary();
    try {
      const { auth, data } = request;

      if (!auth) {
        throw new HttpsError('unauthenticated', 'Sign-in required for translation.');
      }

      const { texts, sourceLanguage, targetLanguage, firestoreDatabaseId } = data;

      if (!Array.isArray(texts)) {
        throw new HttpsError('invalid-argument', '`texts` must be an array.');
      }
      if (!isLang(sourceLanguage) || !isLang(targetLanguage)) {
        throw new HttpsError('invalid-argument', '`sourceLanguage` and `targetLanguage` must be one of "en", "es", "ko".');
      }

      if (texts.length === 0) {
        return { translations: [], cacheHits: 0, geminiCalls: 0 };
      }

      if (sourceLanguage === targetLanguage) {
        return {
          translations: texts.map(t => ({ text: t, status: 'success' as const })),
          cacheHits: texts.length,
          geminiCalls: 0,
        };
      }

      // Filter to non-empty strings for translation; preserve empties in output.
      const translatable = texts.filter((t): t is string => typeof t === 'string' && t.length > 0);
      const unique = [...new Set(translatable)];

      if (unique.length === 0) {
        return {
          translations: texts.map(t => ({ text: t, status: 'success' as const })),
          cacheHits: 0,
          geminiCalls: 0,
        };
      }

      await enforceRateLimit(auth.uid, unique.length, firestoreDatabaseId);

      const db = firestoreDatabaseId ? getFirestore(firestoreDatabaseId) : getFirestore();
      const cacheRefs = unique.map(t =>
        db.doc(`translationCache/${hashKey(t, sourceLanguage, targetLanguage)}`)
      );

      const cacheDocs: FirebaseFirestore.DocumentSnapshot[] = [];
      for (let i = 0; i < cacheRefs.length; i += 100) {
        const chunk = cacheRefs.slice(i, i + 100);
        const docs = await db.getAll(...chunk);
        cacheDocs.push(...docs);
      }

      const resolved = new Map<string, string>();
      const need: string[] = [];
      cacheDocs.forEach((doc, i) => {
        if (doc.exists) {
          const t = doc.data()!.translation;
          if (typeof t === 'string') {
            resolved.set(unique[i], t);
          } else {
            need.push(unique[i]);
          }
        } else {
          need.push(unique[i]);
        }
      });

      let geminiLatencyMs = 0;
      let geminiSucceeded = false;

      if (need.length > 0) {
        const start = Date.now();
        try {
          const translated = await callGemini(need, sourceLanguage, targetLanguage);
          geminiLatencyMs = Date.now() - start;
          geminiSucceeded = true;

          const batch = db.batch();
          need.forEach((source, i) => {
            const ref = db.doc(`translationCache/${hashKey(source, sourceLanguage, targetLanguage)}`);
            batch.set(ref, {
              source,
              translation: translated[i],
              sourceLanguage,
              targetLanguage,
              createdAt: FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();

          need.forEach((source, i) => resolved.set(source, translated[i]));
        } catch (err: any) {
          geminiLatencyMs = Date.now() - start;
          const isModelGone = isModelGoneError(err);
          
          logger.error('translation.gemini_failure', {
            uid: auth.uid,
            batchSize: need.length,
            sourceLanguage,
            targetLanguage,
            model: getGeminiModel(),
            modelGone: isModelGone,
            error: err instanceof Error ? err.message : String(err),
          });

          // Distinguish "model no longer exists" from generic Gemini failures.
          // A 404 from Google or a deprecation message means ops needs to rotate GEMINI_MODEL.
          if (isModelGone) {
            throw new HttpsError(
              'failed-precondition',
              `Gemini model "${getGeminiModel()}" is no longer available. Ops: rotate GEMINI_MODEL and redeploy functions.`
            );
          }
          
          if (err instanceof HttpsError) {
            throw err;
          }
          throw new HttpsError('failed-precondition', `CallGemini error: ${err.message || String(err)}`);
        }
      }

      logger.info('translation.batch', {
        uid: auth.uid,
        requestSize: texts.length,
        uniqueSize: unique.length,
        cacheHits: unique.length - need.length,
        cacheMisses: need.length,
        geminiSucceeded,
        geminiLatencyMs,
        sourceLanguage,
        targetLanguage,
      });

      const translations: TranslationResult[] = texts.map(t => {
        if (typeof t !== 'string' || t.length === 0) {
          return { text: t, status: 'success' as const };
        }
        const result = resolved.get(t);
        if (result === undefined) {
          return { text: t, status: 'error' as const };
        }
        return {
          text: result,
          status: need.includes(t) ? ('success' as const) : ('cached' as const),
        };
      });

      return {
        translations,
        cacheHits: unique.length - need.length,
        geminiCalls: need.length > 0 && geminiSucceeded ? 1 : 0,
      };
    } catch (e: any) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError('failed-precondition', `Top level error: ${e.message || String(e)}`);
    }
  }
);

function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'es' || v === 'ko';
}

function hashKey(text: string, src: Lang, tgt: Lang): string {
  return createHash('sha256').update(`${src}:${tgt}:${text}`).digest('hex').slice(0, 32);
}

async function callGemini(texts: string[], src: Lang, tgt: Lang): Promise<string[]> {
  const client = new GoogleGenAI({ apiKey: resolveGeminiApiKey() });
  const sourceName = LANGUAGE_NAMES[src];
  const targetName = LANGUAGE_NAMES[tgt];

  const prompt = `Translate the following ${sourceName} strings into ${targetName}.
Return a JSON array of strings, one translation per input, in the same order.

Rules:
- Preserve brand names exactly (Valrhona, Callebaut, Kerrygold, Plugrá, etc.).
- Preserve unit abbreviations (g, kg, oz, lb, ml, L) as-is.
- Translate ingredient names, recipe names, and step instructions naturally and idiomatically.
- For Korean target, use natural Korean cooking terminology, not direct Latin transliteration.
- For Spanish target, use neutral Spanish (no regional slang).
- Do not return commentary. Just the JSON array.

Input (${texts.length} ${sourceName} strings):
${JSON.stringify(texts)}`;

  const resp = await client.models.generateContent({
    model: getGeminiModel(),
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });

  const raw = resp.text || '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const stripped = raw.replace(/```json\s*|\s*```/g, '').trim();
    parsed = JSON.parse(stripped);
  }

  if (!Array.isArray(parsed) || parsed.length !== texts.length) {
    throw new Error(`Expected ${texts.length} translations, got ${Array.isArray(parsed) ? parsed.length : typeof parsed}`);
  }
  if (!parsed.every(p => typeof p === 'string')) {
    throw new Error('Translation response contains non-string entries');
  }

  return parsed as string[];
}

async function enforceRateLimit(uid: string, requested: number, databaseId?: string): Promise<void> {
  const db = databaseId ? getFirestore(databaseId) : getFirestore();
  const ref = db.doc(`userQuotas/${uid}`);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const now = Date.now();

    if (!doc.exists) {
      tx.set(ref, {
        translationCount: requested,
        windowStart: now,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return;
    }

    const docData = doc.data()!;
    const windowStart: number = typeof docData.windowStart === 'number' ? docData.windowStart : now;
    const count: number = typeof docData.translationCount === 'number' ? docData.translationCount : 0;

    if (now - windowStart > HOUR_MS) {
      tx.set(ref, {
        translationCount: requested,
        windowStart: now,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return;
    }

    if (count + requested > RATE_LIMIT_PER_HOUR) {
      throw new HttpsError(
        'resource-exhausted',
        `Translation rate limit exceeded (${RATE_LIMIT_PER_HOUR} unique strings per hour). Try again in a few minutes.`
      );
    }

    tx.update(ref, {
      translationCount: count + requested,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
