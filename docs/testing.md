# Testing

Tests fall into three buckets by where they can run:

## Sandbox-runnable (run in any environment with Node)
- `src/**/*.test.ts` — unit tests for utilities and logic
- `functions/test/onTransactionCreate.logic.test.ts` — function logic tests
- `scripts/check-schema-drift.mjs` — schema drift detector

Run: `npm test` and `npm run check:schema`

## Requires Java (Firebase emulator)
- `test/rules/firestore.rules.test.ts` — Firestore security rules
- `functions/test/onTransactionCreate.smoke.test.ts` — function smoke test against emulator

Run:
1. Ensure Java 11+ is installed (`java -version`)
2. `npx firebase emulators:start --only firestore,functions,auth`
3. In another terminal: `npx vitest run test/rules/ functions/test/*.smoke.test.ts`

## Requires a browser (Playwright)
- `test/e2e/**/*.spec.ts` — end-to-end UI flows

Run:
1. `npx playwright install`
2. `npm run dev` in one terminal
3. `npx playwright test` in another

## Pre-deploy checklist

Before every production deploy, all three buckets must pass.
Whoever does the deploy is responsible for verifying.
