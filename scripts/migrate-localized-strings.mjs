#!/usr/bin/env node

/**
 * One-shot migration script that walks every Recipe, Ingredient, and Supplier
 * document and populates the new *I18n fields with LocalizedString shape.
 *
 * Idempotent: skips any document that already has the relevant I18n field.
 *
 * Source-language detection:
 *   - For each free-text field, calls Gemini in batches of up to 50 strings
 *     to detect the primary language (en/es/ko).
 *   - Existing parallel-language fields (nameSpanish, instructionSpanish) are
 *     promoted into translations.es when the primary language differs.
 *
 * Run locally:
 *   gcloud auth application-default login        # one-time, sets up credentials
 *   export GEMINI_API_KEY="<your-key>"
 *   export FIREBASE_PROJECT_ID="<your-project>"  # if not set in firebase config
 *   node scripts/migrate-localized-strings.mjs
 *
 * The script logs progress to stdout, summarizes counts at the end, and
 * exits non-zero on errors.
 */

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Configuration ---

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.1-pro-preview';
const DETECTION_BATCH_SIZE = 50;
const SUPPORTED_LANGUAGES = ['en', 'es', 'ko'];

let projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
  const blueprintPath = path.resolve(__dirname, '..', 'firebase-blueprint.json');
  if (fs.existsSync(blueprintPath)) {
    const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));
    projectId = blueprint.projectId || blueprint.project_id || blueprint.project;
  }
}
if (!projectId) {
  console.error('ERROR: Could not determine Firebase project ID. Set FIREBASE_PROJECT_ID env var or ensure firebase-blueprint.json contains it.');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY env var is required for source-language detection.');
  process.exit(1);
}

// --- Initialize ---

const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : applicationDefault();

initializeApp({ credential, projectId });
const db = getFirestore();
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

console.log(`[migrate] Project: ${projectId}`);
console.log(`[migrate] Gemini model: ${GEMINI_MODEL}`);
console.log('');

// --- Language detection ---

const detectionCache = new Map(); // text → language code

async function detectLanguagesBatch(texts) {
  const unique = [...new Set(texts.filter(t => typeof t === 'string' && t.trim().length > 0))];
  const need = unique.filter(t => !detectionCache.has(t));

  if (need.length === 0) {
    return texts.map(t => detectionCache.get(t) || 'en');
  }

  // Process in chunks of DETECTION_BATCH_SIZE
  for (let i = 0; i < need.length; i += DETECTION_BATCH_SIZE) {
    const chunk = need.slice(i, i + DETECTION_BATCH_SIZE);
    const detected = await callGeminiDetection(chunk);
    chunk.forEach((text, j) => {
      const lang = SUPPORTED_LANGUAGES.includes(detected[j]) ? detected[j] : 'en';
      detectionCache.set(text, lang);
    });
  }

  return texts.map(t => {
    if (typeof t !== 'string' || t.trim().length === 0) return 'en';
    return detectionCache.get(t) || 'en';
  });
}

async function callGeminiDetection(texts) {
  const prompt = `For each input string, identify its primary language. Return a JSON array of language codes ('en', 'es', or 'ko'), one per input, in the same order. For empty, ambiguous, or pure-numeric strings, return 'en'. Brand names should be classified by surrounding text content; isolated brand names default to 'en'.

Input (${texts.length} strings):
${JSON.stringify(texts)}`;

  const resp = await ai.models.generateContent({
    model: GEMINI_MODEL,
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
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = JSON.parse(raw.replace(/```json\s*|\s*```/g, '').trim());
  }
  if (!Array.isArray(parsed) || parsed.length !== texts.length) {
    throw new Error(`Detection response shape mismatch: expected ${texts.length}, got ${parsed?.length}`);
  }
  return parsed;
}

// --- Wrap helper (mirror of src/utils/localized.ts) ---

function wrap(source, sourceLanguage, parallelEs) {
  if (typeof source !== 'string' || source.length === 0) return undefined;
  const result = { source, sourceLanguage };
  if (parallelEs && typeof parallelEs === 'string' && parallelEs.length > 0 && sourceLanguage !== 'es') {
    result.translations = { es: parallelEs };
  }
  return result;
}

// --- Migration: recipes ---

async function migrateRecipes() {
  const snap = await db.collection('recipes').get();
  console.log(`[recipes] Found ${snap.size} documents`);

  let migrated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    // Idempotency: if nameI18n already exists with the new shape, skip.
    if (data.nameI18n && typeof data.nameI18n === 'object' && data.nameI18n.source) {
      skipped++;
      continue;
    }

    // Collect every free-text field that needs detection.
    const fields = [];
    fields.push({ path: 'name', value: data.name });
    fields.push({ path: 'description', value: data.description });
    fields.push({ path: 'storageInstructions', value: data.storageInstructions });
    fields.push({ path: 'shelfLife', value: data.shelfLife });
    fields.push({ path: 'aiExtractionNotes', value: data.aiExtractionNotes });

    for (const [compIdx, comp] of (data.components || []).entries()) {
      fields.push({ path: `components[${compIdx}].name`, value: comp.name });
      for (const [stepIdx, step] of (comp.steps || []).entries()) {
        fields.push({ path: `components[${compIdx}].steps[${stepIdx}].title`, value: step.title });
        fields.push({ path: `components[${compIdx}].steps[${stepIdx}].instruction`, value: step.instruction });
        fields.push({ path: `components[${compIdx}].steps[${stepIdx}].warning`, value: step.warning });
        fields.push({ path: `components[${compIdx}].steps[${stepIdx}].ccpInstruction`, value: step.ccpInstruction });
      }
      for (const [ingIdx, ing] of (comp.ingredients || []).entries()) {
        fields.push({ path: `components[${compIdx}].ingredients[${ingIdx}].state`, value: ing.state });
        fields.push({ path: `components[${compIdx}].ingredients[${ingIdx}].specification`, value: ing.specification });
      }
    }

    // Detect languages in batch.
    const texts = fields.map(f => f.value);
    const langs = await detectLanguagesBatch(texts);

    const langByPath = new Map();
    fields.forEach((f, i) => langByPath.set(f.path, langs[i]));

    // Build the update object.
    const update = {};
    update.nameI18n = wrap(data.name, langByPath.get('name') || 'en', data.nameSpanish);
    update.descriptionI18n = wrap(data.description, langByPath.get('description') || 'en');
    update.storageInstructionsI18n = wrap(data.storageInstructions, langByPath.get('storageInstructions') || 'en');
    update.shelfLifeI18n = wrap(data.shelfLife, langByPath.get('shelfLife') || 'en');
    update.aiExtractionNotesI18n = wrap(data.aiExtractionNotes, langByPath.get('aiExtractionNotes') || 'en');

    update.components = (data.components || []).map((comp, compIdx) => ({
      ...comp,
      nameI18n: wrap(comp.name, langByPath.get(`components[${compIdx}].name`) || 'en'),
      steps: (comp.steps || []).map((step, stepIdx) => {
        const stepPathPrefix = `components[${compIdx}].steps[${stepIdx}]`;
        return {
          ...step,
          titleI18n: wrap(step.title, langByPath.get(`${stepPathPrefix}.title`) || 'en'),
          instructionI18n: wrap(step.instruction, langByPath.get(`${stepPathPrefix}.instruction`) || 'en', step.instructionSpanish),
          warningI18n: wrap(step.warning, langByPath.get(`${stepPathPrefix}.warning`) || 'en'),
          ccpInstructionI18n: wrap(step.ccpInstruction, langByPath.get(`${stepPathPrefix}.ccpInstruction`) || 'en'),
        };
      }),
      ingredients: (comp.ingredients || []).map((ing, ingIdx) => {
        const ingPathPrefix = `components[${compIdx}].ingredients[${ingIdx}]`;
        return {
          ...ing,
          stateI18n: wrap(ing.state, langByPath.get(`${ingPathPrefix}.state`) || 'en'),
          specificationI18n: wrap(ing.specification, langByPath.get(`${ingPathPrefix}.specification`) || 'en'),
        };
      }),
    }));

    // Strip undefined entries so Firestore accepts the write.
    const sanitized = stripUndefined(update);
    sanitized.updatedAt = FieldValue.serverTimestamp();

    await doc.ref.set(sanitized, { merge: true });
    migrated++;

    if (migrated % 10 === 0) {
      console.log(`[recipes] Migrated ${migrated} so far...`);
    }
  }

  console.log(`[recipes] Done: migrated ${migrated}, skipped ${skipped}`);
  return { migrated, skipped };
}

// --- Migration: ingredients ---

async function migrateIngredients() {
  const snap = await db.collection('ingredients').get();
  console.log(`[ingredients] Found ${snap.size} documents`);

  let migrated = 0;
  let skipped = 0;

  // Collect all texts for batch detection
  const allTexts = [];
  const docList = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.nameI18n && typeof data.nameI18n === 'object' && data.nameI18n.source) {
      skipped++;
      continue;
    }
    docList.push({ doc, data });
    allTexts.push(data.name, data.brand);
  }

  if (docList.length === 0) {
    console.log(`[ingredients] Done: migrated 0, skipped ${skipped}`);
    return { migrated: 0, skipped };
  }

  const langs = await detectLanguagesBatch(allTexts);

  for (let i = 0; i < docList.length; i++) {
    const { doc, data } = docList[i];
    const nameLang = langs[i * 2];
    const brandLang = langs[i * 2 + 1];

    const update = {
      nameI18n: wrap(data.name, nameLang || 'en', data.nameSpanish),
      brandI18n: wrap(data.brand, brandLang || 'en'),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await doc.ref.set(stripUndefined(update), { merge: true });
    migrated++;

    if (migrated % 25 === 0) {
      console.log(`[ingredients] Migrated ${migrated} so far...`);
    }
  }

  console.log(`[ingredients] Done: migrated ${migrated}, skipped ${skipped}`);
  return { migrated, skipped };
}

// --- Migration: suppliers ---

async function migrateSuppliers() {
  const snap = await db.collection('suppliers').get();
  console.log(`[suppliers] Found ${snap.size} documents`);

  let migrated = 0;
  let skipped = 0;

  const docList = [];
  const allTexts = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.notesI18n && typeof data.notesI18n === 'object' && data.notesI18n.source) {
      skipped++;
      continue;
    }
    if (typeof data.notes !== 'string' || data.notes.trim().length === 0) {
      // No notes to migrate
      skipped++;
      continue;
    }
    docList.push({ doc, data });
    allTexts.push(data.notes);
  }

  if (docList.length === 0) {
    console.log(`[suppliers] Done: migrated 0, skipped ${skipped}`);
    return { migrated: 0, skipped };
  }

  const langs = await detectLanguagesBatch(allTexts);

  for (let i = 0; i < docList.length; i++) {
    const { doc, data } = docList[i];
    const notesLang = langs[i] || 'en';

    const update = {
      notesI18n: wrap(data.notes, notesLang),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await doc.ref.set(stripUndefined(update), { merge: true });
    migrated++;
  }

  console.log(`[suppliers] Done: migrated ${migrated}, skipped ${skipped}`);
  return { migrated, skipped };
}

// --- Sanitizer ---

function stripUndefined(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = stripUndefined(v);
  }
  return out;
}

// --- Main ---

async function main() {
  console.log('Starting i18n migration...');
  console.log('');

  const recipes = await migrateRecipes();
  console.log('');
  const ingredients = await migrateIngredients();
  console.log('');
  const suppliers = await migrateSuppliers();
  console.log('');

  console.log('=== Summary ===');
  console.log(`Recipes:     migrated ${recipes.migrated}, skipped ${recipes.skipped}`);
  console.log(`Ingredients: migrated ${ingredients.migrated}, skipped ${ingredients.skipped}`);
  console.log(`Suppliers:   migrated ${suppliers.migrated}, skipped ${suppliers.skipped}`);
  console.log('');
  console.log('Migration complete. Re-run any time — already-migrated docs are skipped.');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
