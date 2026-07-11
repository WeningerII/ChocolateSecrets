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
- None taken — this session was inventory only. The backlog's "Recommended
  attack order" proposes: indexes fix → security batch → Node 20 + CI build →
  Send-to-Chef decision → refactor ladder ([[0004-decompose-god-modules]]).

## Files touched
- notes: `memory/architecture/project-backlog.md` (new),
  `memory/architecture/refactor-backlog.md` (link added), this log.

## Pending / next
- Everything in [[project-backlog]]; nothing else in flight.

## Related
- [[project-backlog]] · [[refactor-backlog]] · [[system-overview]]
