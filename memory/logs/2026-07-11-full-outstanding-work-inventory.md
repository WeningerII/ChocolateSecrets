---
title: 2026-07-11 — Full outstanding-work inventory (12-agent audit)
tags: [chocolatesecrets, log]
created: 2026-07-11
updated: 2026-07-11
status: active
type: log
---

# 2026-07-11 — Full outstanding-work inventory

## Done
- Ran a 12-agent audit to answer "everything we have yet to accomplish":
  8 parallel dimension sweeps (vault, code markers, live check suite, docs,
  GitHub, feature stubs, test-coverage map, infra/CI), a completeness critic,
  and 4 critic-proposed follow-ups (Firestore index coverage, accessibility,
  dev-API vs static hosting, app shell/delivery).
- Consolidated ~145 raw findings into the deduplicated, prioritized
  [[project-backlog]] (10 sections, ~90 items).

## Key discoveries (beyond the known [[refactor-backlog]])
- **Prod-broken:** 6 Firestore queries lack composite indexes —
  `dailyExpenseCheck` fails every run (both alert sweeps dead), plus live UI
  paths (kept sourcing notes, vendor pickers). "Send to Chef" cannot work on
  any production deploy (dev-server-only API; misleading network-error toast).
  Functions engine pinned to decommissioned Node 18.
- **Security:** anonymous guest mode grants write access to 16+ collections;
  sourcing_notes ownership hole; App Check off; 22 root prod vulns (1 critical).
- **Systemic gaps:** accessibility near-zero outside AlertsBell/FailureModeSheet;
  test coverage inverted (food-science core superb, data boundaries bare;
  rules tests cover 6/22 collections); ~60 non-test `any` casts at data
  boundaries beyond the 262 i18n casts.
- **Docs vs code drift:** knowledge library documented but nonexistent; smoke
  test named as a deploy gate but never written; es/ko ship ~50 English values
  in expenses/alerts (parity check can't see values).
- **Healthy:** lint + 891/93 tests green, schema/locale/hardcoded checks pass,
  CI green, 0 open issues/PRs, graph fresh, zero TODO comments/skipped tests.

## Decisions
- [[0005-keep-anonymous-guest-mode]] — guest write access kept as accepted risk.
- [[0006-shopping-list-via-callable-function]] — Send-to-Chef ports to an
  authenticated callable Cloud Function with Secret Manager secrets.
- [[0007-remove-owner-email-admin-backdoor]] — email regex + hardcoded fallback
  removed; users/{uid} doc is the single admin source.

## Round 1 executed (same session, later)
Workflow `backlog-attack-round-1` (7 sequential fix agents + 3-lens review, 0
findings): missing composite indexes fixed (`de1906b`), sourcing_notes
ownership hole closed with emulator-verified rules tests (`c69cf70`), PrepList
misleading-error fix + localized `prep:sendUnavailable` (`b82947f`), functions
Node 18→20 (`ad1100f`), CI production-build step (`bb4ad42`), fresh-clone
postinstall bootstrap (`01da977`), npm audit root 22→0 / functions 17→9-moderate
(`5d15773`). ⚠ Indexes/rules still need a manual `firebase deploy`. Round 2
(callable sendShoppingList + backdoor removal) launched next; statuses
annotated in [[project-backlog]].

## Round 2 executed (same session, later still)
Workflow `backlog-attack-round-2` (4 sequential agents + 3-lens review + fix):
- `sendShoppingList` callable landed (`090de92`): auth-required, strict input
  validation, server-templated bodies, honest per-channel results, secrets
  properly BOUND, params via defineString, 21 unit tests. Client rewired via
  typed `shoppingListClient` (`cca8196`) with localized partial-success keys.
- Dev endpoint + `npm start` prod branch retired; root resend/twilio deps
  dropped; `functions/.env.example` added (`fb99c5e`).
- ADR-0007 backdoor removal (`83559b0`): rules + adminRecipients; 35 emulator
  rules tests pass incl. 4 new backdoor-regression tests (mutation-checked).
- Review found 1 major: per-uid rate limit defeated by minting anonymous uids
  (billable SMS channel) → fixed with a global 40/h per-destination cap in the
  same quota transaction (`5b847d7`). A minor SDK error-mapping regression
  (offline/not-deployed both surface as `functions/internal`) was fixed
  directly afterward in `shoppingListClient.ts` using a `navigator.onLine`
  disambiguation.
⚠ One-time deploys now pending: indexes, rules, and functions (secrets +
params first) — steps recorded in [[project-backlog]] and functions/.env.example.

## Round 3 executed (RecipeEditor JSX decomposition)
Refactor-backlog item #1 (top planned refactor) landed (`f3983ac`): extracted
the three tab panels + shared presentational helpers from RecipeEditor.tsx
(1445 → 485 LOC) into `src/components/recipeEditor/{OverviewTab,DesignTab,
ComponentsTab,editorShared}.tsx`. Behavior-preserving verbatim move — parent
keeps all hooks/state/handlers and the `activeTab` wrapper divs. Since the repo
convention is "no jsdom render tests; render coverage lives in the smoke layer"
(per LocalizedField.test.tsx), and the sandbox can't reach Firebase for the e2e
auth flow, I verified with a temporary Vite-served harness that mounted the real
RecipeEditor with mock props and drove it in Chromium: all three tabs render and
switch, production-details toggles, live-math footer renders, and save fires
onSave — plus tsc + 917 tests + production build. Harness files were removed
after the run (not committed). An adversarial verbatim-equivalence review of the
diff was also run.

## Round 4 executed (typed i18n keys)
Refactor-backlog item #3. Diagnosis reframed it: the typed union already existed
(all 26 namespaces registered) — the ~232 `t('key' as any)` casts persisted
because i18next's key-type resolution exceeds TS's instantiation-depth limit on
large nested namespaces, so **bare** deep keys don't typecheck while
**fully-qualified** `t('ns:key')` ones do. Workflow (8 parallel editors on
disjoint files → tsc gate + fix → key-guard → 2-lens review, 0 findings):
removed 103 static casts (fully-qualified), 3 `useTranslation(as any)`, 3
`(t as any)`; kept 121 dynamic template-literal casts (runtime-interpolated keys
are inherently un-typeable — a typed alias fails the overloads, empirically
confirmed). Added `src/i18n.keys.test.ts` (validates 1386 static keys +
dynamic-key prefixes vs en JSON — the real safety net). **Real bugs found &
fixed** (the casts were hiding them, PR #34 class): 12 missing keys (7 renamed
bread-warning kinds + auth/inventory/ledger) added to all 3 locales, and 6
bread-warning interpolation placeholder mismatches (`{{pct}}`/`{{min}}`/`{{score}}`
that the code never passed → blank numbers at runtime) corrected across en/es/ko
(`98b56e1`). Verified: tsc clean, 920 tests, build, locale-parity,
hardcoded-strings all green; 0 static casts remain. Commits `fbdc296` + `98b56e1`.
All four rounds are on PR #40 (branch claude/next-priorities-f3wywa).

## Round 5 executed (Firestore write-path + timestamp boundary anys)
Backlog section D. Scoped after scouting to the coherent Firestore/timestamp
theme (left the harder Gemini-enrichment modeling for a dedicated follow-up).
Workflow (4 sequential impl agents — typing needs tsc as oracle, so serial to
avoid the shared-tree race — → gate → behavior-preservation review, 0 findings):
34 casts removed (`782288f`). `sanitizeData(any):any` → generic identity
`<T>(obj:T):T`; SafeBatch/withTimestamps typed; production.ts + sourcing.ts
timestamps → `Timestamp | FieldValue`; extended `parseFirestoreDate` with an
additive serialized-`{_seconds}` branch and routed the ~9 expense duck-typing
sites through it with an epoch-sentinel + `getTime()!==0` gate (the one place
behavior could drift — review confirmed no "missing date → now" regression); 5
`(ing as any).name` casts removed as unnecessary (RecipeIngredient already types
`name?`). Verified independently: tsc clean, 920 tests, build, locale-parity.
Still open in section D: geminiGenerate payload cast, Gemini enrichment output
modeling (11 casts — deferred), BillReview/save-path casts, ~35 scattered anys.

## Round 6 executed (Gemini enrichment output modeling + AI-proxy payload)
The two hard section-D P1s. Scouting split the casts into spurious (field already
existed) vs genuinely-missing-field. Workflow (2 sequential impl + gate + review,
0 findings): 14 casts removed (`72f8159`). geminiService.ts — added the 4 fields
the reason-pass writes but the type omitted (`inferredEquipment: string[]`,
`yieldEstimate: ReturnType<typeof estimateYield>`, `temperingCurve: TemperingCurve`,
ingredient `alcoholSpec: AlcoholSpec`) using each producing fn's real return type,
then removed all 12 `(recipe as any)/(ing as any)` casts; `ing.category` needed
no cast (types already matched). geminiGenerate.ts — typed the callable payload
with the real @google/genai SDK types (`ContentListUnion`, `GenerateContentConfig`),
closing the client-data-as-any gap in the guardrail proxy with no new runtime
validation. Verified independently: tsc clean, 920 tests, functions build + 119
functions tests, full build, pipeline test; 0 `as any` left in either file.
Section D now: BillReview/save-path casts + ~35 scattered anys remain (the
god-node write helpers, timestamps, i18n, Gemini paths are all done).

## Files touched
- notes: `memory/architecture/project-backlog.md` (new),
  `memory/architecture/refactor-backlog.md` (link added), this log.

## Pending / next
- Everything in [[project-backlog]]; nothing else in flight.

## Related
- [[project-backlog]] · [[refactor-backlog]] · [[system-overview]]
