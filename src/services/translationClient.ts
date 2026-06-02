import { httpsCallable } from 'firebase/functions';
import { LruStorageCache } from '../utils/lruCache';
import { functions } from '../firebase';

type Lang = 'en' | 'es' | 'ko';

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

const persistentCache = new LruStorageCache('translate', 500);

// One-time cleanup of pre-Phase-1 translation cache keys.
(function migrateLegacyCacheKeys() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('translate_v2_') ||
          key.startsWith('translate_v3_') ||
          key.startsWith('translate_v4_') ||
          key.startsWith('v2_') ||
          key.startsWith('v3_') ||
          key.startsWith('v4_'))
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    if (keysToRemove.length > 0) {
      console.info(`[translationClient] Cleaned up ${keysToRemove.length} legacy translation cache entries.`);
    }
  } catch {
    // localStorage unavailable in some environments — ignore.
  }
})();

const memoryCache = new Map<string, TranslationResult>();

interface PendingItem {
  text: string;
  sourceLanguage: Lang;
  targetLanguage: Lang;
  resolve: (result: TranslationResult) => void;
}

let pending: PendingItem[] = [];
let batchTimeout: ReturnType<typeof setTimeout> | null = null;

const cacheKey = (text: string, src: Lang, tgt: Lang): string => `v5_${src}_${tgt}:${text}`;

export function queueTranslation(
  text: string,
  sourceLanguage: Lang,
  targetLanguage: Lang
): Promise<TranslationResult> {
  if (sourceLanguage === targetLanguage) {
    return Promise.resolve({ text, status: 'success' });
  }
  if (!text) {
    return Promise.resolve({ text: '', status: 'success' });
  }

  const key = cacheKey(text, sourceLanguage, targetLanguage);

  if (memoryCache.has(key)) {
    return Promise.resolve(memoryCache.get(key)!);
  }

  const stored = persistentCache.get(key);
  if (stored) {
    const result: TranslationResult = { text: stored, status: 'cached' };
    memoryCache.set(key, result);
    return Promise.resolve(result);
  }

  return new Promise((resolve) => {
    pending.push({ text, sourceLanguage, targetLanguage, resolve });
    if (!batchTimeout) {
      batchTimeout = setTimeout(() => {
        batchTimeout = null;
        void processBatch();
      }, 300);
    }
  });
}

async function processBatch(): Promise<void> {
  if (pending.length === 0) return;
  const batch = [...pending];
  pending = [];

  // Group by (source, target) language pair.
  const byPair = new Map<string, PendingItem[]>();
  for (const item of batch) {
    const k = `${item.sourceLanguage}->${item.targetLanguage}`;
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k)!.push(item);
  }

  const translate = httpsCallable<TranslateRequest, TranslateResponse>(functions, 'translateBatch');

  for (const [, items] of byPair) {
    const src = items[0].sourceLanguage;
    const tgt = items[0].targetLanguage;
    const texts = items.map((i) => i.text);
    const unique = [...new Set(texts)];

    const map = new Map<string, TranslationResult>();

    try {
      // Translation runs server-side via the `translateBatch` Cloud Function,
      // which holds the Gemini key in Secret Manager, enforces the per-user
      // quota, and persists a shared Firestore cache. The browser only sends its
      // local cache-misses; the server dedups/chunks internally and returns
      // results aligned 1:1 with the input order.
      const resp = await translate({ texts: unique, sourceLanguage: src, targetLanguage: tgt });
      const translations = resp.data?.translations ?? [];

      unique.forEach((text, index) => {
        const result: TranslationResult = translations[index] ?? { text, status: 'error' };
        map.set(text, result);
        const key = cacheKey(text, src, tgt);
        memoryCache.set(key, result);
        if (result.status !== 'error') {
          persistentCache.set(key, result.text);
        }
      });

      for (const item of items) {
        const result = map.get(item.text) ?? { text: item.text, status: 'error' as const };
        item.resolve(result);
      }
    } catch (e) {
      console.error('[translationClient] Batch translation request failed:', e);
      for (const item of items) {
        item.resolve({ text: item.text, status: 'error' });
      }
    }
  }
}
