#!/usr/bin/env node

/**
 * Pre-deploy secret guard: verifies GEMINI_API_KEY is configured in
 * Firebase Secret Manager before allowing a production deploy to proceed.
 *
 * This requires the authenticated `firebase` CLI, so it must run ONLY in a
 * deploy pipeline — not in the per-PR static-checks lane (where the CLI is
 * absent and `CI=true`, which previously made this step fail on every PR).
 * Opt in by setting CHECK_FUNCTIONS_SECRETS=1 in the deploy workflow.
 *
 * Exit 0: secret is configured (or the check is not enabled — skipped).
 * Exit 1: secret missing when the check is enabled — blocks deploy.
 */

import { execSync } from 'node:child_process';

if (process.env.CHECK_FUNCTIONS_SECRETS !== '1') {
  console.log('check-functions-secrets: not enabled (set CHECK_FUNCTIONS_SECRETS=1 in the deploy pipeline). Skipping.');
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
