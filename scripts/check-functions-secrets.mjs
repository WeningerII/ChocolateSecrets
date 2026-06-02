#!/usr/bin/env node

/**
 * Pre-deploy secret guard: verifies GEMINI_API_KEY is configured in
 * Firebase Secret Manager before allowing a production deploy to proceed.
 *
 * Skipped outside CI (local development uses process.env fallback).
 *
 * Exit 0: secret is configured (or running locally — skipped).
 * Exit 1: secret missing in CI environment — blocks deploy.
 */

import { execSync } from 'node:child_process';

if (!process.env.CI) {
  console.log('check-functions-secrets: not in CI, skipping. Local dev uses process.env.GEMINI_API_KEY fallback.');
  process.exit(0);
}

try {
  // `firebase functions:secrets:access` exits non-zero if the secret doesn't exist.
  // We don't need the value here — we just need to confirm the secret exists.
  execSync('firebase functions:secrets:access GEMINI_API_KEY', {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  console.log('check-functions-secrets: GEMINI_API_KEY is configured in Secret Manager.');
  process.exit(0);
} catch (err) {
  console.error('check-functions-secrets: FAILED.');
  console.error('  GEMINI_API_KEY is not configured in Firebase Secret Manager.');
  console.error('  Production deploys must use Secret Manager, not env vars.');
  console.error('');
  console.error('  Fix: firebase functions:secrets:set GEMINI_API_KEY');
  console.error('');
  process.exit(1);
}
