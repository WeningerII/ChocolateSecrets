#!/usr/bin/env node

/**
 * One-shot migration that flips every Recipe document's crossContactRisks
 * field from the legacy string[] shape to the structured CrossContactRisk[]
 * shape introduced in Phase 5.
 *
 * Strategy: parse each legacy string with a regex that matches the format
 * produced by identifyCrossContactRisks before Phase 5:
 *
 *   "Cross-contact risk: {allergen} present in shared {station}"
 *
 * Documents whose crossContactRisks field is already structured (first item
 * is an object) are skipped. Documents with no crossContactRisks field are
 * skipped. Strings that fail to parse are logged and dropped from the
 * migrated array — they're cached display strings, not source data, and
 * the next save will recompute correctly.
 *
 * Idempotent: safe to run multiple times.
 *
 * Run locally:
 *   gcloud auth application-default login        # one-time
 *   export FIREBASE_PROJECT_ID="<your-project>"  # if not in firebase config
 *   node scripts/migrate-cross-contact-risks.mjs
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

const LEGACY_RE = /^Cross-contact risk:\s+(\w+)\s+present in shared\s+(\w+)\s*$/;

function parseLegacyString(s) {
  const m = LEGACY_RE.exec(s);
  if (!m) return null;
  const allergen = m[1];
  const stationRaw = m[2];
  // 'workspace' was the fallback when no station was provided. Normalize back.
  const station = stationRaw === 'workspace' ? undefined : stationRaw;
  return station ? { allergen, station } : { allergen };
}

async function migrate() {
  const snap = await db.collection('recipes').get();
  let migrated = 0;
  let skippedAlreadyStructured = 0;
  let skippedNoField = 0;
  let parseFailures = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const arr = data.crossContactRisks;

    if (!Array.isArray(arr) || arr.length === 0) {
      skippedNoField++;
      continue;
    }

    // Already structured? Skip.
    if (typeof arr[0] === 'object' && arr[0] !== null) {
      skippedAlreadyStructured++;
      continue;
    }

    const newShape = [];
    for (const item of arr) {
      if (typeof item !== 'string') {
        // Defensive: a mixed-shape doc shouldn't exist, but if it did, keep
        // structured items and skip everything else.
        if (typeof item === 'object' && item !== null && 'allergen' in item) {
          newShape.push(item);
        }
        continue;
      }
      const parsed = parseLegacyString(item);
      if (!parsed) {
        parseFailures++;
        console.warn(`[recipe ${doc.id}] could not parse: ${JSON.stringify(item)}`);
        continue;
      }
      newShape.push(parsed);
    }

    await doc.ref.update({ crossContactRisks: newShape });
    migrated++;
    if (migrated % 25 === 0) {
      console.log(`Migrated ${migrated} recipes so far...`);
    }
  }

  console.log('');
  console.log('=== Migration complete ===');
  console.log(`  Migrated:                 ${migrated}`);
  console.log(`  Already structured:       ${skippedAlreadyStructured}`);
  console.log(`  No crossContactRisks:     ${skippedNoField}`);
  console.log(`  Parse failures (dropped): ${parseFailures}`);
  console.log(`  Total recipes scanned:    ${snap.size}`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
