import { defineConfig } from 'vitest/config';

// Dedicated config for the Firestore security-rules tests. The default
// vitest.config.ts *excludes* test/rules (they need the Firestore emulator and
// must not run in the normal unit-test pass), so running them requires this
// config which includes them explicitly. Invoked via `npm run test:rules`,
// itself run under `firebase emulators:exec --only firestore`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/rules/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
