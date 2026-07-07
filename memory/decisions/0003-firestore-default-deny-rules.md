---
title: ADR-0003 — Firestore is default-deny, role-based
tags: [chocolatesecrets, decision]
created: 2026-07-07
updated: 2026-07-07
status: active
type: decision
---

# ADR-0003 — Firestore is default-deny, role-based

## Context
Restaurant/kitchen data (recipes, costs, inventory, expenses) must not leak across
tenants or to unauthorized roles. The app starts in guest mode (anonymous auth)
and only gates admin features behind Google sign-in.

## Decision
`firestore.rules` (~27 KB) is **default-deny**: every collection must explicitly
allow access, scoped by authenticated role (admin/staff) and tenant. Rules are
unit-tested against the emulator (`test/rules`, `vitest.config.rules.ts`,
`npm run test:rules`).

## Consequences
- Any new collection/field needs an explicit rule **and** a rules test — a missing
  rule fails closed (denied), which is the safe default.
- Changes to `firestore.rules` must keep `npm run test:rules` green before deploy.
- Rules deploy to the **named** database declared in `firebase.json`.

## Related
- [[firebase-and-security]] · [[system-overview]]
