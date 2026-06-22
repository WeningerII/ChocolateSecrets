# Deployment Readiness Checklist

Before deploying to Luisa's production Firebase project, every item below must pass.
Whoever does the deploy is responsible for verifying.

## 1. Sandbox-runnable tests (should already be green)
- [ ] `npm run lint` passes
- [ ] `npm test` passes (expect ~530 tests)
- [ ] `npm run check:schema` exits 0

## 2. Non-sandbox tests (require Java + Chrome)
- [ ] `npx firebase emulators:start --only firestore,functions,auth` runs without error
- [ ] `npx vitest run test/rules/` passes (Firestore rules tests)
- [ ] `npx vitest run functions/test/onTransactionCreate.smoke.test.ts` passes (function smoke test)
- [ ] `npx playwright test` passes against a staging Firebase project

## 3. Manual verification against staging
- [ ] Seed an admin user in `users/` collection with `role: 'admin'`
- [ ] Log in as admin — restaurant settings should be accessible
- [ ] Log in as staff — /admin/restaurant should redirect to /
- [ ] Receive a PO — ingredient stock increases, WAC updates, shopping list dedupes
- [ ] Run a production that consumes enough to drop stock below threshold — shopping list gets exactly one entry
- [ ] Complete an audit with a variance — ledger gets an audit_adjustment transaction
- [ ] Open a recipe with a sub-recipe used in two components — cost calculation matches expected (run the bonbon fixture mentally)

## 4. Data migrations
- [ ] Log in as admin, click "Run recipe migration" in Restaurant Settings
- [ ] Verify migration result shows non-zero migrated OR reports everything already current
- [ ] Spot-check 3-5 recipes in Firestore console — they should have `components` and no top-level `ingredients`

## 5. Cloud Function deployment
- [ ] `cd functions && npm install && npm run build`
- [ ] `firebase deploy --only functions`
- [ ] Confirm the `GEMINI_API_KEY` secret is set — the AI functions (`extractBill`, `geminiGenerate`, `translateBatch`) read it from Secret Manager, not from any client env var: `firebase functions:secrets:set GEMINI_API_KEY`
- [ ] Test: create a receive transaction manually in Firestore console, watch the ingredient doc update within 5 seconds
- [ ] Test: in the deployed app, run a receipt/label scan and a sourcing search — both now call the `geminiGenerate` function (the key is no longer in the browser)

## 6. Environment variables
- [ ] The Gemini API key is NO LONGER bundled into the client. Do **not** set `GEMINI_API_KEY` / `VITE_GEMINI_API_KEY` for the web build — all Gemini calls are proxied through the `geminiGenerate` / `extractBill` Cloud Functions, which read the key from the `GEMINI_API_KEY` server secret (see section 5).
- [ ] Any other env vars the app expects (Firebase web config) are set

## 7. Post-deploy smoke check
- [ ] Log in via the deployed app
- [ ] Navigate through: Ingredients, Recipes, PrepList, Shopping List, Reports
- [ ] No console errors in browser devtools

## Rollback plan
If production misbehaves after deploy:
- `firebase functions:delete onTransactionCreate` reverts the function
- Previous app build can be redeployed from the last known-good commit
- Firestore data changes are NOT easily reversible — the inventory reconciliation script at `scripts/reconcile-inventory.mjs` helps detect corruption
