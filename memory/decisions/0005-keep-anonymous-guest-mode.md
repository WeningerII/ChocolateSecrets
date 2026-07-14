---
title: ADR-0005 — Keep anonymous guest mode with write access (accepted risk)
tags: [chocolatesecrets, decision, security]
created: 2026-07-11
updated: 2026-07-11
status: active
type: decision
---

# ADR-0005 — Keep anonymous guest mode with write access (accepted risk)

## Context
The 2026-07-11 audit ([[project-backlog]], section B) flagged that
`signInAsGuest()` (`src/firebase.ts:51`) creates an anonymous session that
satisfies `isAuthenticated()` — the only rule gate on create/update for 16+
Firestore collections (and delete on `shopping_list`/`sourcing_notes`). Any
visitor to the deployed SPA can therefore write to production kitchen data.

## Decision
**Keep guest mode as-is.** The owner explicitly chose to accept this risk
(2026-07-11): ChocolateSecrets is a small internal tool with an obscure URL,
and frictionless guest exploration is valued over write-lockdown.

## Consequences
- The write surface stays open by design; this is no longer an open backlog
  item but a standing, documented posture.
- Compensating controls remain worth doing independently: the
  [[0003-firestore-default-deny-rules]] structure, App Check enforcement
  (still pending, see [[project-backlog]] B-3), and the `sourcing_notes`
  ownership fix (landed separately — hijacking *other users'* data was never
  part of the accepted risk).

## Revisit triggers
Revisit if any of: the app URL is shared beyond the team, real financial data
volume grows (bills/payments), App Check enforcement lands (cheap moment to
also gate writes), or any evidence of anonymous abuse appears.

## Related
- [[project-backlog]] · [[0003-firestore-default-deny-rules]] · [[system-overview]]
