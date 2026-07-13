import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * i18n key-existence guard.
 *
 * TypeScript cannot verify i18next keys — `t('ns:some.key')` is just a string
 * literal to the compiler, and `t(`ns:prefix.${x}`)` is fully dynamic. That
 * means a whole namespace/prefix can be wrong (the PR #34 class of bug:
 * `chemistry:taste.*` written where the real subtree is
 * `chemistry:detail.taste.*`) and nothing catches it until the UI renders raw
 * keys in production. This test is the real safety net.
 *
 * It scans all source under src/ for t() calls and checks two shapes against
 * the English locale JSON (the source of truth; locale-parity.mjs guarantees
 * es/ko mirror en):
 *
 *   STATIC   t('ns:dotted.path')   — the exact key must resolve in en/<ns>.json.
 *   DYNAMIC  t(`ns:prefix.${...}`) — the literal STATIC PREFIX (everything
 *                                    before the first `${`, trailing '.'
 *                                    stripped) must resolve to an OBJECT
 *                                    subtree in en/<ns>.json. If the prefix is
 *                                    wrong, none of the runtime-computed leaf
 *                                    keys under it can ever resolve.
 *
 * Deliberately NOT checked:
 *   - Bare (non-namespaced) keys like t('save'): whether they resolve depends
 *     on the caller's default-namespace binding, which is too context-dependent
 *     to check statically.
 *   - t() calls whose first argument is a plain variable/expression: nothing
 *     literal to validate.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = __dirname; // this file lives at src/i18n.keys.test.ts
const localesRoot = path.join(srcRoot, 'locales', 'en');

// ---------------------------------------------------------------------------
// 1. Load every en namespace into a lookup keyed by namespace name.
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

const locales: Record<string, Json> = {};
for (const file of fs.readdirSync(localesRoot)) {
  if (!file.endsWith('.json')) continue;
  const ns = file.slice(0, -'.json'.length);
  locales[ns] = JSON.parse(fs.readFileSync(path.join(localesRoot, file), 'utf-8')) as Json;
}

/**
 * Resolve a `ns:a.b.c` key against the loaded locales.
 * Returns whether it exists and the value found (for type checks).
 */
function resolve(ns: string, dottedPath: string): { exists: boolean; value: unknown } {
  const root = locales[ns];
  if (root === undefined) return { exists: false, value: undefined };
  if (dottedPath === '') return { exists: true, value: root };
  let cur: unknown = root;
  for (const part of dottedPath.split('.')) {
    if (cur === null || typeof cur !== 'object') return { exists: false, value: undefined };
    if (!Object.prototype.hasOwnProperty.call(cur, part)) return { exists: false, value: undefined };
    cur = (cur as Json)[part];
  }
  return { exists: true, value: cur };
}

// i18next resolves a plural key like `t('foo.bar', { count })` against suffixed
// variants (`foo.bar_one`, `foo.bar_other`, …) rather than a bare `foo.bar`.
// A static key is therefore valid if the exact key OR any plural variant of it
// exists.
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other', '_plural'];

function keyResolves(ns: string, dottedPath: string): boolean {
  if (resolve(ns, dottedPath).exists) return true;
  for (const suffix of PLURAL_SUFFIXES) {
    if (resolve(ns, dottedPath + suffix).exists) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 2. Collect source files (src/**/*.{ts,tsx}) excluding tests and this file.
// ---------------------------------------------------------------------------

const SELF = path.resolve(__filename ?? path.join(srcRoot, 'i18n.keys.test.ts'));

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'locales') continue;
      yield* walk(full);
    } else if (/\.tsx?$/.test(entry.name)) {
      if (/\.test\.|\.spec\.|\.d\.ts$/.test(entry.name)) continue;
      if (path.resolve(full) === SELF) continue;
      yield full;
    }
  }
}

const sourceFiles = [...walk(srcRoot)];

// ---------------------------------------------------------------------------
// 3. Extract STATIC and DYNAMIC keys.
// ---------------------------------------------------------------------------

// STATIC: t('ns:dotted.path') or t("ns:dotted.path"). Namespace-prefixed only
// (must contain a ':'). Path chars: letters, digits, '.', '_', '-'.
const STATIC_RE = /\bt\(\s*(['"])([A-Za-z][\w-]*:[\w.-]+)\1/g;

// DYNAMIC: t(`ns:literal.prefix.${ ... }`). Capture the literal segment between
// the opening backtick and the first `${`. Must be namespace-prefixed.
const DYNAMIC_RE = /\bt\(\s*`([A-Za-z][\w-]*:[^`]*?)\$\{/g;

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

interface Finding {
  file: string;
  line: number;
  kind: 'static' | 'dynamic';
  key: string; // ns:path as written (prefix for dynamic)
  reason: string;
}

const staticFindings: Finding[] = [];
const dynamicFindings: Finding[] = [];

let staticChecked = 0;
let dynamicChecked = 0;
const staticKeySet = new Set<string>();
const dynamicPrefixSet = new Set<string>();

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(path.dirname(srcRoot), file); // relative to repo root-ish

  let m: RegExpExecArray | null;

  STATIC_RE.lastIndex = 0;
  while ((m = STATIC_RE.exec(text)) !== null) {
    const full = m[2]; // ns:path
    const [ns, ...rest] = full.split(':');
    const dotted = rest.join(':');
    staticChecked++;
    staticKeySet.add(full);
    const exists = keyResolves(ns, dotted);
    if (!exists) {
      staticFindings.push({
        file: rel,
        line: lineOf(text, m.index),
        kind: 'static',
        key: full,
        reason: locales[ns] === undefined
          ? `namespace "${ns}" has no en/${ns}.json`
          : `key does not resolve in en/${ns}.json`,
      });
    }
  }

  DYNAMIC_RE.lastIndex = 0;
  while ((m = DYNAMIC_RE.exec(text)) !== null) {
    const literal = m[1]; // ns:prefix.  (up to first ${)
    const colon = literal.indexOf(':');
    const ns = literal.slice(0, colon);
    const rawPrefix = literal.slice(colon + 1);
    // We only validate DOTTED-subtree prefixes: the literal part must end with
    // '.', meaning the interpolation supplies a whole child key under a subtree
    // (the PR #34 class, e.g. `chemistry:detail.taste.quality.${x}`). When the
    // literal does NOT end with '.', the interpolation is concatenated into a
    // key *segment* (e.g. `ingredientInfo:chocolate${Type}` -> `chocolateDark`),
    // which cannot be resolved to a subtree and is skipped.
    if (!rawPrefix.endsWith('.')) continue;
    const prefix = rawPrefix.slice(0, -1);
    // If nothing literal remains before ${ (e.g. t(`ns:${x}`)), there is no
    // static prefix to validate — skip.
    if (prefix === '') continue;
    dynamicChecked++;
    dynamicPrefixSet.add(`${ns}:${prefix}`);
    const { exists, value } = resolve(ns, prefix);
    const isObject = exists && value !== null && typeof value === 'object' && !Array.isArray(value);
    if (!isObject) {
      dynamicFindings.push({
        file: rel,
        line: lineOf(text, m.index),
        kind: 'dynamic',
        key: `${ns}:${prefix}`,
        reason: locales[ns] === undefined
          ? `namespace "${ns}" has no en/${ns}.json`
          : !exists
            ? `prefix subtree does not exist in en/${ns}.json`
            : `prefix resolves but is not an object subtree in en/${ns}.json`,
      });
    }
  }
}

function format(findings: Finding[]): string {
  return findings
    .map((f) => `  ${f.file}:${f.line}  [${f.kind}]  "${f.key}"  — ${f.reason}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// 4. Assertions.
// ---------------------------------------------------------------------------

describe('i18n key-existence guard', () => {
  it('scans source and loads locales', () => {
    expect(Object.keys(locales).length).toBeGreaterThan(0);
    expect(sourceFiles.length).toBeGreaterThan(0);
    // Visibility into coverage (shown in vitest output).
    // eslint-disable-next-line no-console
    console.log(
      `[i18n-guard] namespaces=${Object.keys(locales).length} sourceFiles=${sourceFiles.length} ` +
        `staticKeyOccurrences=${staticChecked} distinctStaticKeys=${staticKeySet.size} ` +
        `dynamicPrefixOccurrences=${dynamicChecked} distinctDynamicPrefixes=${dynamicPrefixSet.size} ` +
        `totalDistinctValidated=${staticKeySet.size + dynamicPrefixSet.size}`,
    );
  });

  it('every namespace-prefixed STATIC t() key resolves in en locale', () => {
    expect(
      staticFindings,
      staticFindings.length
        ? `\nMissing i18n static keys (${staticFindings.length}):\n${format(staticFindings)}\n`
        : undefined,
    ).toEqual([]);
  });

  it('every DYNAMIC t(`ns:prefix.${...}`) static prefix resolves to an object subtree in en locale', () => {
    expect(
      dynamicFindings,
      dynamicFindings.length
        ? `\nMissing i18n dynamic-key prefixes (${dynamicFindings.length}):\n${format(dynamicFindings)}\n`
        : undefined,
    ).toEqual([]);
  });
});
