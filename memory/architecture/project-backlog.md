---
title: Project Backlog — full outstanding-work inventory (2026-07-11)
tags: [chocolatesecrets, architecture, backlog, audit]
created: 2026-07-11
updated: 2026-07-11
status: active
type: architecture
---

# Project Backlog — full outstanding-work inventory

> **Status 2026-07-11 (round 1 executed):** items marked ✅ below landed on
> `claude/next-priorities-f3wywa` and passed a 3-lens adversarial review with
> zero findings. `[~]` = partially done or decided-with-work-pending.
> Decisions taken: [[0005-keep-anonymous-guest-mode]] ·
> [[0006-shopping-list-via-callable-function]] ·
> [[0007-remove-owner-email-admin-backdoor]].

Complete inventory of everything left to do, produced 2026-07-11 by a 12-agent
audit (8 dimension sweeps + completeness critic + 4 follow-up sweeps) covering:
the vault, code markers, the full check suite (run live), docs, GitHub, feature
stubs, test coverage, infra/CI, Firestore indexes, accessibility, the dev-API/
static-hosting mismatch, and app-shell delivery. Supersedes nothing — the
UI-gated items in [[refactor-backlog]] are folded in here (section E).
See [[system-overview]] for where these components live.

Legend: `[priority][effort]` — P0 broken/blocking · P1 important · P2 normal ·
P3 nice-to-have; S <1h · M ~a day · L multi-day.

**Verified healthy (for contrast):** lint (tsc) clean; 891 root + 93 functions
tests green; schema-drift, locale-parity, hardcoded-strings checks pass; graph
fresh; CI green on main; 0 open issues/PRs; no TODO/FIXME comments anywhere; no
skipped tests; routes/nav all real; food-science core exceptionally well tested.

## A. Broken in production right now

- [x] [P0][S] **Fix missing Firestore composite indexes (6 uncovered queries).**
  ✅ landed 2026-07-11 (`de1906b`) — ⚠ still requires a manual
  `firebase deploy --only firestore:indexes` (no automation, C-6).
  `dailyExpenseCheck` throws `failed-precondition` on BOTH its sweeps
  (`functions/src/dailyExpenseCheck.ts:39` bills vendorId==+billDate range+status-in;
  `:90` status-in+dueDate range), killing missing-bill and due-soon alerts daily.
  Also: `onBillReviewed.ts:101` anomaly fallback (vendorId+status+orderBy billDate);
  `src/hooks/useKeptSourcingNotes.ts:17` (ingredientId==+orderBy keptAt — UI silently
  shows zero kept notes); `src/services/vendorsService.ts:63` (isActive+name — vendor
  pickers fail); latent `recurringExpectationsService.ts:48` (isActive+createdAt).
- [x] [P2][S] **Repair firestore.indexes.json itself.** ✅ landed with `de1906b`. 1 orphaned index
  (inventoryTransactions ingredientId+date matches no query) and 3 single-field
  entries that duplicate automatic indexes — the Admin API may reject the file
  on deploy (fewer than two fields per composite).
- [x] [P1][S] **"Send to Chef" is dead in every production deploy.**
  ✅ fully fixed: error handling (`b82947f`), then the real backend
  (`090de92`/`cca8196`) — needs one-time secrets + functions deploy.
  `src/pages/PrepList.tsx:472` POSTs `/api/send-shopping-list`, which only exists
  in the dev `server.ts`; the Hosting `**` rewrite returns 200+HTML, the client
  `.json()` throws before the `ok` check (`:481`) and users see a misleading
  "network error" (`:489`). Button never hidden/gated (`:974`).
- [x] [P1][M] **Decide + build the production home for shopping-list send.**
  ✅ done per [[0006-shopping-list-via-callable-function]]: `sendShoppingList`
  callable (`090de92`: auth-gated, per-uid 20/h + global 40/h rate limits,
  server-templated bodies, honest per-channel results, 21 unit tests), client
  rewire (`cca8196`), dev endpoint + `npm start` retired (`fb99c5e`).
  ⚠ one-time deploy: `firebase functions:secrets:set RESEND_API_KEY /
  TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN`, fill `functions/.env` params
  (RESEND_FROM must be a Resend-verified sender), then
  `firebase deploy --only functions`.
  No Cloud Function equivalent exists. Options: callable CF with auth + App Check
  (secrets via Secret Manager), HTTPS function + `/api/**` hosting rewrite, or
  remove/flag the UI. Also decide whether the `npm start` self-hosted path
  (`server.ts:94`) is real (document + harden) or vestigial (delete).
- [ ] [P2][S] **server.ts email leg broken even in dev.** Hardcoded Resend sandbox
  sender `onboarding@resend.dev` (`server.ts:57`) can't deliver to arbitrary
  CHEF_EMAIL; server returns 200 `{success:true}` regardless (`:62,80`) → false
  success toast. Also Twilio 1600-char overflow → partial send (`:66`).
- [x] [P1][S] **Bump Cloud Functions off decommissioned Node 18.** ✅ landed
  (`ad1100f`, engines 18→20; lockfile synced in `01da977`).
  `functions/package.json` engines.node "18"; GCF Node 18 decommissioned 2025-10;
  new deploys rejected. CI already tests on Node 20.
- [ ] [P2][M] **Translate the shipped-English es/ko strings.** ~50 English values
  per locale in `src/locales/{es,ko}/expenses.json` + `alerts.json` — key parity
  passes, values are English; Spanish/Korean users see English across the newest
  feature area. Consider extending check:locale-parity to flag value-equality.

## B. Security & data protection

- [x] [P1][M] **Rethink anonymous guest-mode write access.** ✅ closed by
  decision 2026-07-11: risk accepted, kept as-is — [[0005-keep-anonymous-guest-mode]]
  (revisit triggers recorded there). `signInAsGuest()`
  (`src/firebase.ts:51`) satisfies `isAuthenticated()`, the only gate on
  create/update for 16+ collections (delete too on shopping_list/sourcing_notes)
  — any visitor can write/corrupt kitchen data. (firestore.rules:352-509)
- [x] [P1][S] **Close the sourcing_notes ownership hole.** ✅ landed (`c69cf70`,
  rules + 6 emulator-verified tests incl. mutation check against the old rules). Update checks only the
  incoming `keptBy`, never `resource.data.keptBy`; delete has no owner check —
  any user can hijack/delete others' notes. (firestore.rules:443-445)
- [ ] [P1][M] **Finish the security-hardening "To do"** (docs/security-hardening.md):
  enable App Check end-to-end (register app, set `VITE_FIREBASE_APPCHECK_SITE_KEY`,
  flip enforcement, `enforceAppCheck: true` on callables); restrict the public web
  API key (scripts/harden-gcp.sh); verify deployed rules on the named DB and lock
  `(default)`; prune Auth authorized domains; optional key rotation.
- [x] [P1][S] **Patch dependency vulnerabilities.** ✅ landed (`5d15773`): root
  prod 22→0; functions 17→9 moderate (single upstream `uuid` advisory via
  firebase-admin — blocked on Google; revisit at firebase-admin 14). Root prod audit: 22 vulns
  (1 critical protobufjs, 9 high incl. vite + react-router) — non-breaking
  `npm audit fix` available; functions: 17 (4 high; full fix = firebase-admin@14).
- [x] [P1][S] **Harden /api/send-shopping-list if server.ts survives.** ✅ moot:
  endpoint removed (`fb99c5e`); the callable replacement is auth-gated,
  rate-limited (per-uid + global), and server-templates all message bodies.
- [x] [P2][S] **Decide the owner-email admin backdoor.** ✅ removed (`83559b0`)
  per [[0007-remove-owner-email-admin-backdoor]]: rules email-branch gone,
  adminRecipients fallback gone, 4 emulator-verified regression tests added.
  ⚠ needs a rules deploy; ensure the owner's users doc has `role: "admin"` first. `isAdmin()` regex-matches
  `weningerii@gmail.com` (firestore.rules:37-44) — committed PII, unauditable
  second admin path surviving role revocation; also hardcoded fallback in
  `functions/src/utils/adminRecipients.ts:19`.
- [ ] [P3][S] **Pin workflow supply chain.** Actions referenced by mutable tags;
  graphify-graph.yml pip-installs unpinned `graphifyy` with contents:write.

## C. CI/CD & deploy pipeline

- [x] [P1][S] **Run `npm run build` on PRs + add a bundle-size budget.**
  ✅ fully done: build step (`bb4ad42`) + bundle budget (`024ab9c`:
  scripts/check-bundle-size.mjs in CI, largest chunk <=300 kB gzip, now 249). The
  production build first runs post-merge in deploy-pages.yml; a broken bundle
  merges green. (checks.yml)
- [ ] [P2][S] **Gate deploy-pages on checks.** It triggers on push to main
  independently — a red checks run doesn't block the Pages deploy.
- [ ] [P2][S] **Exercise the functions emit-build in CI.** Deploy-time tsc
  (commonjs/es2017→lib) differs from root `--noEmit`; failures surface only at
  `firebase deploy`.
- [ ] [P1][M] **Make e2e real.** Not in any CI job; the "shopping list dedup" spec
  is half-written placeholders that can't pass (test/e2e/critical-flows.spec.ts:48-68);
  the first test doesn't implement its own title (prep/audit steps missing); no
  seed script for required staging data; e2e README's retarget instructions are
  unfollowable (config hard-imported from firebase-applet-config.json, no
  VITE_FIREBASE_* env path).
- [x] [P2][M] **Enable hosting auto-deploy.** ✅ push-on-main trigger enabled
  (round 8); activates once the `FIREBASE_SERVICE_ACCOUNT` secret is added
  (one-time browser task — see deploy guide). Was: firebase-hosting.yml manual-only
  pending the `FIREBASE_SERVICE_ACCOUNT` secret; Google sign-in only fully works
  on Hosting (Pages serves the auth handler cross-origin).
- [~] [P2][M] **Automate rules/indexes/functions deploys.** ✅ rules+indexes done
  (round 8): `.github/workflows/deploy-firestore.yml` deploys on merge, gated on
  the 159-test emulator suite, targeting the named DB. Functions deploy remains
  manual (needs Resend/Twilio secrets — deferred with Send-to-Chef). Was: no workflow runs
  `firebase deploy --only firestore|functions`; drift risk is aggravated by the
  named database (a mistargeted manual deploy updates `(default)` silently).
- [ ] [P2][S] **Wire up check:functions-secrets.** Gated on
  `CHECK_FUNCTIONS_SECRETS=1` that nothing sets → the GEMINI_API_KEY Secret
  Manager guard never runs; production secret state unverified.
- [x] [P1][S] **Fix fresh-clone DX.** ✅ landed (`01da977`: root postinstall
  bootstraps functions deps; CLAUDE.md + README updated). Root `npm run lint`/`npm test` fail with 20
  TS errors until `npm --prefix functions install` — the CLAUDE.md/README
  quick-start omits that step; document or auto-install.
- [ ] [P2][S] **Add .firebaserc** (default project alias) — documented CLI flows
  need manual `-P absolute-pulsar-301421` today.
- [ ] [P2][S] **Add Dependabot/Renovate.** No automated dep updates.
- [ ] [P2][L] **Dependency currency.** 31 root + 5 functions packages outdated;
  majors behind: vite 8, express 5, typescript 7, twilio 6, firebase-admin 14,
  @google/genai 2, react-router/@types majors, etc.
- [ ] [P3][S] Root package.json: add `engines`; fix `start` script (`node server.ts`
  can't execute TS — dev uses tsx).
- [ ] [P3][S] Add hosting security/caching headers (firebase.json has none).
- [ ] [P3][S] Silence DEP0040 punycode warning noise in test runs.
- [ ] [P3][S] Add a LICENSE (public repo, defaults to all-rights-reserved).

## D. Type-safety debt at data boundaries (~60 non-test casts + 262 i18n casts)

- [x] [P1][S] **geminiGenerate passes client payload as `any` into the Gemini SDK**
  ✅ done (`72f8159`): typed with the real @google/genai SDK types
  (`ContentListUnion`, `GenerateContentConfig`); both casts gone, no new runtime
  validation. Closes the client-data-as-any gap in the guardrail proxy.
- [x] [P1][M] **Type `src/utils/firestore.ts` write helpers** ✅ done (`782288f`):
  `sanitizeData<T>(obj:T):T` generic identity, SafeBatch.set/update typed via
  `WithFieldValue<DocumentData>`/`DocumentData`, `withTimestamps` generic — bodies
  byte-identical, 8 anys gone.
- [x] [P1][M] **Model the Gemini enrichment output.** ✅ done (`72f8159`, 12
  casts): added the 4 fields the reason-pass actually writes but the type omitted
  — `inferredEquipment?: string[]`, `yieldEstimate?: ReturnType<typeof
  estimateYield>`, `temperingCurve?: TemperingCurve`, ingredient `alcoholSpec?:
  AlcoholSpec` — using each producing fn's real return type; the other casts wrote
  already-existing fields. `ing.category` needed no cast (types already matched).
  Also clears the 6th inline-name cast (geminiService.ts:706).
- [x] [P1][S] **Fix `createdAt?: any; updatedAt?: any`** on the shared production
  type. ✅ done (`782288f`): `Timestamp | FieldValue` in production.ts (Restaurant)
  and sourcing.ts (SourcingNote.keptAt). Other type files already used this.
- [x] [P2][M] **Typed i18next keys** ([[refactor-backlog]] #3) — ✅ done
  (`fbdc296`, `98b56e1`). NB the premise was partly wrong: the type decl already
  existed and all 26 namespaces (incl. chemistry) were registered. The casts
  persisted because i18next's key-type hits TS's instantiation-depth limit on big
  nested namespaces — so **bare** deep keys fail to typecheck but **fully-qualified**
  `t('ns:key')` ones pass. Removed 103 static casts (fully-qualified), 3
  `useTranslation(as any)`, 3 `(t as any)`; 121 **dynamic** template-literal casts
  kept (runtime-interpolated keys are inherently un-typeable — a typed alias does
  not satisfy the overloads). Added `src/i18n.keys.test.ts` — a vitest guard
  validating 1386 static keys + dynamic-key prefixes against the en JSON (the real
  safety net for the dynamic case). **Real bugs found & fixed:** 12 missing keys
  the casts hid (7 renamed bread-warning kinds + auth/inventory/ledger keys) and 6
  bread-warning interpolation placeholder mismatches that rendered blank numbers.
- [x] [P2][M] **One typed Firestore-Timestamp coercion helper** ✅ done
  (`782288f`): extended `parseFirestoreDate` (src/utils/date.ts) with an additive
  branch for serialized `{_seconds}/{seconds}` timestamps (they arrive as plain
  objects from Cloud Functions/REST, not Timestamp instances — which is why the
  duck-typing existed); routed all ~9 sites through it with an epoch-sentinel +
  `getTime()!==0` gate that preserves the old no-date truthiness exactly (18 casts
  removed). Adversarial review confirmed no "missing date → now" drift.
- [ ] [P2][S] BillReview builds the bill doc through 7 `as any` casts
  (src/components/BillReview.tsx:256-274).
- [ ] [P2][S] Ingredient/recipe save paths coerce via `as unknown as` + `(data as
  any).dietary` + `delete (finalData as any).lots` (Ingredients.tsx:192-201,
  IngredientDetail.tsx:126, Recipes.tsx:369).
- [ ] [P2][S] RecipeEditor state fields accessed via `(state as any)
  .storageEnvironment/shelfLifeDays/storageInstructions`; reducer action union has
  `t: any` ×2 (RecipeEditor.tsx:809-836; recipeEditor.types.ts:13,19).
- [x] [P2][S] Model the inline-ingredient name variant — `(ing as any).name`
  fallback. ✅ done: 5 removed in `782288f` (all UNNECESSARY —
  `RecipeIngredient` already declares `name?: string`), 6th cleared in `72f8159`
  with the Gemini-enrichment work.
- [ ] [P2][S] Untyped AI/payment parsing in services + functions: sourcingService
  (6 `any`s), extractBill.ts:155-206, recordPayment.ts:33-36, translation.ts
  catch params.
- [ ] [P2][M] ~35 residual scattered `any`s across src (InventoryTransactions,
  ProductionCalendar, ErrorBoundary, stepDsl, rrule, etc.).
- [ ] [P2][S] **Un-swallow the extraction-issues parse failure** — bare `catch {}`
  drops all validation issues on corrupt sessionStorage, and the "first recipe"
  keying stopgap mis-applies issues on multi-recipe extractions.
  (src/components/RecipeEditor.tsx:165-175)
- [ ] [P3][S] 6 benign bare `catch {}` fallbacks with zero telemetry (cooking-mode
  progress, ZIP lookup, lruCache evictions).
- [ ] [P3][S] Verify the lone `eslint-disable react-hooks/exhaustive-deps`
  (RecipeEditor.tsx:135); DEV-gate the `console.debug` (Recipes.tsx:127).
- [ ] [P3][S] ~92 test-file `any`s — fixture-drift risk, low priority.

## E. Refactors (from [[refactor-backlog]] / PR #39 deferral)

- [x] [P1][L] **Decompose RecipeEditor.tsx JSX (~1445 LOC) into tab sub-components**
  ✅ done (`f3983ac`): 1445 → 485 LOC; extracted `OverviewTab`, `DesignTab`,
  `ComponentsTab`, `editorShared` under `src/components/recipeEditor/`. Verbatim
  move — parent keeps all hooks/state/handlers + the tab wrappers. Verified via
  tsc + 917 tests + build + a real-browser smoke drive (all three tabs render/
  switch, production-details toggle, live-math footer, save→onSave). Backlog #1.
- [ ] [P2][L] **Split the ~25-`useState` pages** (Ingredients, BillReview,
  PrepList) into reducers/child components; click-through verify. Backlog #2.
- Process (binding on each): one item per PR; lint + tests + manual UI pass;
  `graphify update .` after structural splits ([[0004-decompose-god-modules]]).

## F. Test gaps (coverage is inverted: algorithmic core superb, boundaries bare)

- [ ] [P1][M] recipeReducer (222 LOC) — zero tests.
- [ ] [P1][M] geminiService: extractReceiptData, extractProductLabel,
  estimateStockFromImage untested (only extractRecipe pipeline covered).
- [ ] [P1][M] Cloud Functions untested: geminiGenerate (incl. userQuotas
  rate-limit transaction) and extractBill (only helper utils covered).
- [ ] [P1][S] translation.errors.test.ts re-declares `isModelGone` instead of
  importing it — tests a copy; the real module has zero test imports.
- [ ] [P1][M] DataContext + ToastContext — zero tests (app-wide data access).
- [ ] [P1][S] Data-integrity utils untested: crossContactRecompute (food safety),
  shoppingList, recipeMigration/recipeRoleMigration + 5 more of 9/23 utils.
- [ ] [P2][M] 6 Firestore CRUD services (bills, payments, vendors, sourcing,
  alerts, recurringExpectations) + geminiClient/translationClient untested.
- [ ] [P2][M] 8 of 9 hooks untested (useUserRole, useFormulationOptimizer, …);
  useRecipePhysics is well covered.
- [ ] [P2][S] handleFirestoreError/firebase.ts, culinary/yield.ts, server.ts
  endpoints untested.
- [ ] [P2][L] Component/page rendering coverage ~3/56 and 1/18.
- [x] [P1][M] **Rules tests cover only 6 of 22 collections.** ✅ done (`63b7fec`):
  now all 22 covered — added 124 emulator-verified tests in 4 isolated files
  (securityCfOnly, recipesAndCatalog, inventoryOps, expensesAndDefaultDeny). The
  security-critical ones are done: payments/userQuotas/translationCache/
  archivedLots `if false` write-locks, the alerts dismissedAt-only diff rule,
  recipes 50-component boundary, and the default-deny catch-all. Full suite 159
  pass; adversarial review found no false coverage; a mutation check
  (payments `if false`→`if true` fails 4 tests) confirms the assertions bite.
- [ ] [P2][S] Emulator-level trigger tests (onTransactionCreate/onLotUpdate touch
  only extracted pure functions); resolveVendor wrapper; adminRecipients.
- [ ] [P3][M] 8 maintenance/migration scripts (~1,280 LOC, run against prod
  Firestore) untested.
- [ ] [P1][M] **Write the documented smoke test or remove its five references.**
  `functions/test/onTransactionCreate.smoke.test.ts` never existed, yet is a
  named deploy gate (docs/testing.md:14, deploy-readiness.md:14, README.md:90)
  and pre-excluded (package.json:14, vitest.config.ts:12 — matches zero files).
- [ ] [P2][L] e2e coverage for primary flows (auth, recipe edit, expenses
  pipeline, POs, cooking mode, reports, formulate lab…) — currently 1 spec/4
  tests, one a stub. (Overlaps C/e2e item for the harness side.)

## G. Half-built / promised features

- [ ] [P1][L] **Knowledge library: build it or delete the docs.** README.md:20
  advertises "reference content with vector embeddings"; docs/knowledge-seed.md
  gives seeding steps for a `/admin/knowledge` route — none of it exists in code.
- [ ] [P2][M] USDA live FoodData Central lookups: `VITE_USDA_FDC_API_KEY`
  documented in .env.example + README but read by nothing; usdaFoodData.ts is
  snapshot-only (chocolate rows marked placeholder pending chocolateSpec resolver).
- [ ] [P2][M] Optimizer "candidate additions" engine-complete but unreachable —
  Formulate.tsx hardcodes `candidateAdditionIds: []`; no picker UI.
  (src/services/foodScience/optimizer/searchSpace.ts:110-124)
- [ ] [P2][M] Admin role-promotion UI ("not built yet" — docs/admin-seed.md);
  roles managed by manual Firestore edits.
- [ ] [P2][S] **Finish the Gemini model-rotation migration.** GEMINI_MODEL is
  never bound as a function secret (rotation procedure in functions/src/
  constants.ts + translation.ts:220 is dead); 4 client call sites in
  geminiService.ts + sourcingService.ts:61 still send a client-pinned model that
  overrides the server default (geminiGenerate.ts:42); src/constants/gemini.ts
  says "migrate then delete this file" — transport migration is already done.
- [x] [P3][S] Delete dead `GoogleGenAI` import in server.ts:6. ✅ removed in
  `fb99c5e` (with the whole production-serve branch and `npm start` path,
  per [[0002-gemini-server-side-only]] hygiene).
- [ ] [P1][S] **Run the pending-deletions production gate** before removing the
  legacy `Recipe.ingredients` shape: re-run migrateRecipesToV2 in prod, expect
  `liftedLegacyIngredients === 0`, spot-check recipes. (docs/pending-deletions.md)
- [ ] [P3][S] CoA overrides for exotic milk-powder compositions when bulk
  sourcing starts (docs/pending-features.md:30-34) — standing conditional.
- [ ] [P2][M] Surface Reports unit-conversion warnings in the UI (currently
  console.warn only — costing errors invisible; Reports.tsx:109-113); preferment
  temperature as a real metadata field (bread/evaluate.ts:74-77).

## H. Accessibility (systemic — only AlertsBell + FailureModeSheet show any a11y work)

- [ ] [P0][L] All 14 modals/sheets: no role="dialog"/aria-modal/focus trap/initial
  focus/restore; 13/14 lack Escape-to-close.
- [ ] [P0][L] Form labels: 168 `<label>`s, only 4 `htmlFor` — screen readers
  announce unlabeled inputs (RecipeEditor 34/2, BillReview 13/0, Ingredients 17/0).
- [ ] [P0][M] Clickable `<div>` navigation is mouse-only in 7 of 8 files
  (BillsList, VendorsList, RecurringExpectationsList, PrepList) — no
  tabIndex/onKeyDown/role.
- [ ] [P1][M] ~57 icon-only buttons with no accessible name across 32 files
  (every modal X, steppers, row actions, mobile menu).
- [ ] [P1][S] Toasts: no aria-live/role="status" — zero live regions app-wide;
  loading spinners silent.
- [ ] [P1][S] `documentElement.lang` never synced on language change (index.html
  hardcodes lang="en"; es/ko mispronounced app-wide); language select unlabeled.
- [ ] [P1][M] Recharts charts: no accessibilityLayer/label/data-table fallback
  (Dashboard, IngredientDetail); scanner `<video>` unnamed, results unannounced.
- [ ] [P2][S] Skip-to-content link; label the duplicate desktop/mobile navs;
  mobile drawer isn't a dialog.
- [ ] [P2][M] Color-only status indicators (alert dots, low-stock red text,
  recipe-tier dots) need sr-only text/icons.
- [ ] [P2][S] **Add ESLint + eslint-plugin-jsx-a11y** (repo has no ESLint at all)
  and axe checks in e2e — the cheapest systemic guard.
- [ ] [P3][S] Tab bar semantics (Expenses); prefers-reduced-motion support.

## I. App shell & delivery

- [x] [P1][S] Favicon ✅ done (`024ab9c`): brand-copper chocolate-bar SVG in new
  public/ + link tags. (PNG apple-touch still a nice-to-have — no raster tooling
  in-sandbox.) Was: none exists — blank tab icon
  + 404 on /favicon.ico on every load.
- [x] [P1][S] Self-host fonts ✅ done (`024ab9c`): @fontsource-variable Fraunces
  + Inter bundled via main.tsx; CDN links removed; tailwind families updated.
  Was: (Fraunces/Inter via Google CDN):
  render-blocking third party, breaks offline kitchen use, GDPR exposure; also
  move `<meta charset>` first.
- [x] [P2][S] Meta description/OG/twitter/theme-color; robots.txt ✅ done
  (`024ab9c`): full head meta + theme-color #B87333, robots.txt Disallow: /,
  manifest.webmanifest. Was: missing (likely
  `Disallow: /` for an internal dashboard); apple-touch-icon.
- [ ] [P2][M] Main entry chunk 725 kB min / ~249 kB gzip (now guarded by the CI
  budget at 300; splitting it further still open) —
  analyze with visualizer, split eager imports.
- [ ] [P3][M] Per-page (and localized) `document.title` — one static English
  title for all routes today.
- [ ] [P3][L] PWA/manifest/offline: no stated intent anywhere — write a decision
  note ([[0001-adopt-graphify-obsidian-memory]]-style ADR) rather than default-drift.

## J. Docs & memory-vault hygiene

- [ ] [P2][S] Fix docs/testing.md + deploy-readiness.md drift: rules-test command
  runs zero tests as written (vitest excludes test/rules/**; CI uses
  `emulators:exec`); smoke-test refs (see F); "~530 tests" → ~891; suite
  inventory lists 1 of 10 functions test files; e2e's manual-only status unsaid;
  understates what CI automates.
- [ ] [P2][S] Fix docs/security-hardening.md drift: claims Google sign-in gates
  the app (guest mode contradicts); rules line-count/order self-verify wrong
  (default-deny is the FIRST block).
- [ ] [P3][S] memory-system.md: stale branch name in runbook, stale graph stats.
- [ ] [P3][S] Reconcile owner persona (Tony vs Luisa) and the divergent functions
  build commands (README `ci` vs deploy-readiness `install`).
- [ ] [P2][S] Add the "Send to Chef is dev-only" caveat (or the chosen fix) to
  [[system-overview]], [[inventory-and-lots]], and deploy-readiness — the vault
  currently records the feature as working.
- [ ] [P3][S] Vault: backfill (or accept) the missing session log for the PR #39
  refactor session; exempt or fix memory/README.md + memory/CLAUDE.md re
  frontmatter/wikilink rules; ADR-0001's deferred "global Obsidian vault"
  mitigation; bootstrap-log user-side steps (open vault in Obsidian).
- [ ] [P3][S] Graphify enrichment (deferred pending LLM key): `graphify label .`
  for community names; decide whether docs/prose join the graph.
- [ ] [P3][S] .env.example: remove dead `VITE_USDA_FDC_API_KEY` (or build G-2);
  add missing `GEMINI_API_KEY` (local dev), `GEMINI_MODEL`, `SUPER_ADMIN_EMAIL`;
  add a functions/.env.example.

## Recommended attack order

1. **Indexes fix** (A-1/A-2) — smallest diff, un-breaks a scheduled job + live UI.
2. **Security batch** (B-1..B-4): guest-mode decision, sourcing_notes rule,
   `npm audit fix`, then the hardening checklist.
3. **Node 20 bump + CI build step + fresh-clone DX** (A-6, C-1, C-8).
4. **Send-to-Chef decision** (A-3..A-5) — bug fix now, architecture decision next.
5. Then the planned refactor ladder (E) interleaved with test gaps (F) — the
   RecipeEditor JSX split remains the top planned refactor.

## Related

- [[refactor-backlog]] · [[system-overview]] · [[0004-decompose-god-modules]] ·
  [[0002-gemini-server-side-only]] · [[0003-firestore-default-deny-rules]]
