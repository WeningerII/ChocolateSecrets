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

## Files touched
- notes: `memory/architecture/project-backlog.md` (new),
  `memory/architecture/refactor-backlog.md` (link added), this log.

## Pending / next
- Everything in [[project-backlog]]; nothing else in flight.

## Related
- [[project-backlog]] · [[refactor-backlog]] · [[system-overview]]
