---
title: Firebase & Security
tags: [chocolatesecrets, domain]
created: 2026-07-07
updated: 2026-07-07
status: active
type: domain
---

# Firebase & Security

## What this covers
Firestore access, security rules, auth/roles, and App Check.

## Key code
- `src/firebase.ts` — initializes the app, exports `db` (a *named* Firestore
  database) and `handleFirestoreError()` (god nodes); optional App Check.
- App-wide data access: `useData()` in `src/contexts/DataContext.tsx`.
- `firestore.rules` (~27 KB) — **default-deny**, role-based (see
  [[0003-firestore-default-deny-rules]]); indexes in `firestore.indexes.json`.
- Rules tests: `test/rules`, `vitest.config.rules.ts` (`npm run test:rules`,
  needs the emulator + Java).

## Rules / gotchas
- Guest mode = Firebase **anonymous auth**; Google sign-in only gates admin.
- Any new collection/field needs an explicit rule **and** a rules test — missing
  rules fail closed.
- Rules deploy to the **named** DB declared in `firebase.json`.

## Related
- [[system-overview]] · [[0003-firestore-default-deny-rules]] · [[cloud-functions-and-triggers]]
