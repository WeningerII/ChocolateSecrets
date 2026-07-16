#!/usr/bin/env node
// Bundle-size budget guard. Run AFTER `npm run build`. Fails if the largest
// single JS chunk exceeds the gzip budget, so an accidental heavy import (or a
// dependency bloat) can't silently balloon the initial payload. Tune BUDGET_KB
// deliberately when a real, justified increase lands.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const ASSETS_DIR = 'dist/assets';
const BUDGET_KB = 300; // largest single JS chunk, gzipped

let files;
try {
  files = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.js'));
} catch {
  console.error(`✗ ${ASSETS_DIR} not found — run \`npm run build\` first.`);
  process.exit(1);
}

const chunks = files
  .map((f) => {
    const raw = readFileSync(join(ASSETS_DIR, f));
    return { f, min: statSync(join(ASSETS_DIR, f)).size, gz: gzipSync(raw).length };
  })
  .sort((a, b) => b.gz - a.gz);

const kb = (n) => (n / 1024).toFixed(1);
const largest = chunks[0];
const totalGz = chunks.reduce((s, c) => s + c.gz, 0);

console.log(`Bundle: ${chunks.length} JS chunks, ${kb(totalGz)} kB gzip total.`);
console.log('Largest chunks (gzip):');
for (const c of chunks.slice(0, 5)) console.log(`  ${kb(c.gz).padStart(7)} kB  ${c.f}`);

if (largest.gz / 1024 > BUDGET_KB) {
  console.error(
    `\n✗ Largest chunk ${largest.f} is ${kb(largest.gz)} kB gzip, over the ${BUDGET_KB} kB budget.\n` +
      `  Code-split it (dynamic import) or, if the growth is justified, raise BUDGET_KB in scripts/check-bundle-size.mjs.`,
  );
  process.exit(1);
}

console.log(`\n✓ Largest chunk ${kb(largest.gz)} kB gzip is within the ${BUDGET_KB} kB budget.`);
