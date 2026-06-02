#!/usr/bin/env node

/**
 * Hardcoded-string sweep: scans .tsx files in src/ for human-readable
 * English literals that should go through i18n.
 *
 * Two patterns are flagged:
 *
 *   1. JSX text content (between > and <) that is at least three words
 *      and starts with a capital letter or contains a sentence-like cue.
 *
 *   2. JSX attribute literals on user-facing attributes
 *      (title, placeholder, aria-label, alt) with at least three words.
 *
 * Tuning notes:
 *   - The three-word minimum cuts most false positives. UI labels like
 *     "Cancel" or "Save" are fine in source — they live in common.json
 *     and get added when a phase touches them. Single words almost never
 *     need i18n.
 *   - Files matching IGNORED_PATHS are skipped (test, dev-only utilities,
 *     migration scripts).
 *   - Lines containing IGNORED_CONTEXT markers are skipped (lets you
 *     opt out of a flag inline by adding `// i18n-ignore` on the line).
 *   - The script is a static check, not a parser. It will misclassify
 *     edge cases. The right response to a false positive is to refine
 *     the regex or add an inline ignore — never to suppress globally.
 *
 * Failure: exit code 1 with a list of file:line entries to fix.
 * Success: exit code 0.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'src');

// Files to skip entirely
const IGNORED_PATHS = [
  /\.test\.tsx?$/,
  /\.spec\.tsx?$/,
  /__mocks__/,
  /\.d\.ts$/,
];

// Inline marker — add `// i18n-ignore` to the line to suppress a flag
const IGNORE_MARKER = 'i18n-ignore';

// Attributes whose literal values are user-facing and need translation
const USER_FACING_ATTRS = ['title', 'placeholder', 'aria-label', 'aria-description', 'alt'];

// Lower-bound on word count for a literal to be flagged.
const MIN_WORDS = 3;

// JSX text between > and <. Ignores fully-whitespace, code-like (camelCase,
// snake_case, kebab-case starting with lowercase), and pure punctuation.
//
// We're working line-by-line to keep line numbers, which means multi-line
// JSX text gets evaluated per line. That's fine — single-line literals
// are where the real bugs hide.
const JSX_TEXT_RE = />([^<>{}]*)</g;

// Attribute literal: attrName="value with spaces"
const ATTR_RE = new RegExp(`\\b(${USER_FACING_ATTRS.join('|')})\\s*=\\s*"([^"]+)"`, 'g');

function shouldIgnoreFile(file) {
  for (const re of IGNORED_PATHS) if (re.test(file)) return true;
  return false;
}

function looksLikeEnglishSentence(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  // Skip if pure whitespace or punctuation
  if (!/[A-Za-z]/.test(trimmed)) return false;
  // Skip code-like strings
  if (/^[a-z][a-zA-Z0-9_-]*$/.test(trimmed)) return false;
  // Skip URLs / paths
  if (/^https?:\/\//.test(trimmed)) return false;
  if (/^\/[a-z]/.test(trimmed)) return false;
  // Skip CSS-y values
  if (/^[\d.]+(px|rem|em|%)\b/.test(trimmed)) return false;
  // Word count threshold
  const words = trimmed.split(/\s+/).filter(w => /[A-Za-z]/.test(w));
  if (words.length < MIN_WORDS) return false;
  return true;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      yield* walk(full);
    } else if (entry.name.endsWith('.tsx')) {
      yield full;
    }
  }
}

const findings = [];

for (const file of walk(srcRoot)) {
  if (shouldIgnoreFile(file)) continue;
  const text = fs.readFileSync(file, 'utf-8');
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(IGNORE_MARKER)) continue;

    // JSX text content
    let m;
    JSX_TEXT_RE.lastIndex = 0;
    while ((m = JSX_TEXT_RE.exec(line)) !== null) {
      const inner = m[1];
      if (looksLikeEnglishSentence(inner)) {
        findings.push({ file: path.relative(repoRoot, file), line: i + 1, kind: 'jsx-text', text: inner.trim() });
      }
    }

    // Attribute literals
    ATTR_RE.lastIndex = 0;
    while ((m = ATTR_RE.exec(line)) !== null) {
      const attr = m[1];
      const value = m[2];
      if (looksLikeEnglishSentence(value)) {
        findings.push({ file: path.relative(repoRoot, file), line: i + 1, kind: `attr:${attr}`, text: value });
      }
    }
  }
}

if (findings.length > 0) {
  console.error(`Hardcoded English strings detected (${findings.length}):`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  [${f.kind}]  "${f.text}"`);
  }
  console.error('');
  console.error('Each should either go through t() or be marked with // i18n-ignore on the same line.');
  console.error('Inline ignores are appropriate for: code identifiers shown to developers, debug output, programmatic strings that never reach a non-English UI.');
  process.exit(1);
} else {
  console.log('No hardcoded English strings detected.');
}
