---
title: ADR-0007 — Remove the hardcoded owner-email admin backdoor
tags: [chocolatesecrets, decision, security, firestore-rules]
created: 2026-07-11
updated: 2026-07-11
status: active
type: decision
---

# ADR-0007 — Remove the hardcoded owner-email admin backdoor

## Context
`isAdmin()` in `firestore.rules` (~lines 37-44) grants admin to any verified
sign-in whose email regex-matches `weningerii@gmail.com`, independent of the
`users/{uid}` role doc; `functions/src/utils/adminRecipients.ts:19` carries the
same email as a hardcoded fallback. The audit ([[project-backlog]], section B)
flagged it as committed PII and an unauditable second admin path that survives
role revocation. docs/security-hardening.md calls it an intentional bootstrap.

## Decision
**Remove it** (owner's choice, 2026-07-11): the `users/{uid}` role doc is the
single source of admin truth. The rules regex goes away; `adminRecipients.ts`
keeps only its `SUPER_ADMIN_EMAIL` env/secret path (no hardcoded literal).

## Consequences
- If the owner's `users` doc is ever lost/corrupted, recovery is a manual
  Firestore console edit (re-set `role: "admin"`) — accepted.
- `docs/security-hardening.md` and [[firebase-and-security]] must drop the
  bootstrap-backdoor description.
- Rules tests must keep asserting admin comes only from the users doc
  (keep [[0003-firestore-default-deny-rules]] green).

## Related
- [[project-backlog]] · [[0003-firestore-default-deny-rules]] · [[firebase-and-security]]
