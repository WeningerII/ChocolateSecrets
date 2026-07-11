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

## Files touched
- notes: `memory/architecture/project-backlog.md` (new),
  `memory/architecture/refactor-backlog.md` (link added), this log.

## Pending / next
- Everything in [[project-backlog]]; nothing else in flight.

## Related
- [[project-backlog]] · [[refactor-backlog]] · [[system-overview]]
