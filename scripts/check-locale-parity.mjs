#!/usr/bin/env node

/**
 * Locale parity check: verifies every key in the English locale resource
 * exists in Spanish and Korean (and vice-versa, since drift in either
 * direction is a bug).
 *
 * Walks each namespace JSON file in src/locales/en, recursively flattens
 * the key tree to dotted paths, and diffs against the same shape from
 * src/locales/es and src/locales/ko.
 *
 * Failure modes caught:
 *   - Adding a new key to one language and forgetting another
 *     (silent fallback to English in production)
 *   - Renaming a key in one language and not the others
 *   - Whole sub-objects missing from a non-default language
 *
 * Failure modes NOT caught:
 *   - Translation quality
 *   - Placeholder mismatches (e.g., {{count}} in en, {{n}} in ko)
 *     — that's a job for a runtime test or a separate static check
 *
 * Pluralization keys (e.g. `_one`, `_other`, `_plural`) are walked the
 * same as any other key. i18next pluralization rules differ across
 * languages, but the simplest correct policy in this codebase is "every
 * pluralization slot present in English must be present in every other
 * language." Korean and Spanish both have valid `_one` / `_other`
 * pluralization in i18next, even though Korean morphology doesn't
 * actually pluralize — the renderer still chooses based on count.
 *
 * Exit code 0 on parity. Exit code 1 on any divergence, with a report
 * of which language is missing which keys.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const localesRoot = path.join(repoRoot, 'src/locales');

const REFERENCE_LANG = 'en';
const OTHER_LANGS = ['es', 'ko'];

function flattenKeys(obj, prefix = '') {
  const out = [];
  if (obj === null || typeof obj !== 'object') {
    out.push(prefix);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flattenKeys(v, next));
    } else {
      out.push(next);
    }
  }
  return out;
}

function loadNamespace(lang, ns) {
  const file = path.join(localesRoot, lang, ns);
  if (!fs.existsSync(file)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

const referenceFiles = fs.readdirSync(path.join(localesRoot, REFERENCE_LANG))
  .filter(f => f.endsWith('.json'))
  .sort();

let hasDrift = false;
const report = [];

for (const ns of referenceFiles) {
  const refData = loadNamespace(REFERENCE_LANG, ns);
  const refKeys = new Set(flattenKeys(refData));

  for (const lang of OTHER_LANGS) {
    const otherData = loadNamespace(lang, ns);
    if (otherData === null) {
      report.push(`MISSING FILE: src/locales/${lang}/${ns}`);
      hasDrift = true;
      continue;
    }
    const otherKeys = new Set(flattenKeys(otherData));

    const missingInOther = [...refKeys].filter(k => !otherKeys.has(k)).sort();
    const extraInOther = [...otherKeys].filter(k => !refKeys.has(k)).sort();

    if (missingInOther.length || extraInOther.length) {
      hasDrift = true;
      report.push(`\n${ns} — ${REFERENCE_LANG} vs ${lang}:`);
      if (missingInOther.length) {
        report.push(`  Missing in ${lang} (${missingInOther.length}):`);
        for (const k of missingInOther) report.push(`    ${k}`);
      }
      if (extraInOther.length) {
        report.push(`  Extra in ${lang} (${extraInOther.length}):`);
        for (const k of extraInOther) report.push(`    ${k}`);
      }
    }
  }

  // Placeholder consistency: every {{var}} present in the English value must
  // appear in the corresponding non-English value, and vice-versa.
  function getValue(obj, dottedKey) {
    let cur = obj;
    for (const part of dottedKey.split('.')) {
      if (cur === null || typeof cur !== 'object') return undefined;
      cur = cur[part];
    }
    return typeof cur === 'string' ? cur : undefined;
  }

  function extractPlaceholders(s) {
    const set = new Set();
    if (typeof s !== 'string') return set;
    const re = /\{\{(\w+)\}\}/g;
    let m;
    while ((m = re.exec(s)) !== null) set.add(m[1]);
    return set;
  }

  for (const lang of OTHER_LANGS) {
    const otherData = loadNamespace(lang, ns);
    if (otherData === null) continue;
    for (const key of refKeys) {
      const enVal = getValue(refData, key);
      const otherVal = getValue(otherData, key);
      if (enVal === undefined || otherVal === undefined) continue;

      // Verify coverage: value shouldn't be exactly the same as English, or empty.
      if (typeof enVal === 'string' && typeof otherVal === 'string') {
        if (otherVal.trim() === '') {
          hasDrift = true;
          report.push(`\n${ns} — ${lang}:${key} is empty (lacks coverage)`);
        } else if (enVal === otherVal && enVal.trim() !== '' && !/^[0-9]+$/.test(enVal)) {
          // If they match perfectly but aren't just numbers, we probably missed translating it
          // EXCEPTIONS: some proper nouns or simple words might be the exact same, but usually it's a gap.
          // hasDrift = true; // DO NOT FAIL ON THIS, as requested by user "The script warns about identical values—that's normal, ignore it"
          report.push(`\n${ns} — ${lang}:${key} matches English exactly (lacks coverage): "${otherVal}"`);
        }
      }

      const enPlaceholders = extractPlaceholders(enVal);
      const otherPlaceholders = extractPlaceholders(otherVal);
      const missing = [...enPlaceholders].filter(p => !otherPlaceholders.has(p));
      const extra = [...otherPlaceholders].filter(p => !enPlaceholders.has(p));
      if (missing.length || extra.length) {
        hasDrift = true;
        report.push(`\n${ns} — ${REFERENCE_LANG}:${key} vs ${lang}:${key}:`);
        if (missing.length) report.push(`  Missing placeholders in ${lang}: ${missing.map(p => `{{${p}}}`).join(', ')}`);
        if (extra.length)   report.push(`  Extra placeholders in ${lang}: ${extra.map(p => `{{${p}}}`).join(', ')}`);
      }
    }
  }
}

// Also check: every namespace file present in en must exist in es and ko
const enFiles = new Set(fs.readdirSync(path.join(localesRoot, REFERENCE_LANG)).filter(f => f.endsWith('.json')));
for (const lang of OTHER_LANGS) {
  const langFiles = new Set(fs.readdirSync(path.join(localesRoot, lang)).filter(f => f.endsWith('.json')));
  for (const f of langFiles) {
    if (!enFiles.has(f)) {
      report.push(`\nFile present in ${lang}/ but not in ${REFERENCE_LANG}/: ${f}`);
      hasDrift = true;
    }
  }
}

if (hasDrift) {
  console.error('Locale parity drift detected:');
  console.error(report.join('\n'));
  console.error('\nFix: add missing keys to the diverging language file, or remove keys from the language that has extras.');
  process.exit(1);
} else {
  console.log(`Locale parity OK across ${OTHER_LANGS.length + 1} languages, ${referenceFiles.length} namespaces.`);
}
