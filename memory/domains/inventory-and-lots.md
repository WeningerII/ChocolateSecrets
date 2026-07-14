---
title: Inventory & Lots
tags: [chocolatesecrets, domain]
created: 2026-07-07
updated: 2026-07-07
status: active
type: domain
---

# Inventory & Lots

## What this covers
Receiving goods, stock lots, inventory transactions, audits, and a
threshold-driven shopping list.

## Key code
- Pages: `src/pages/Inventory.tsx`, `src/pages/InventoryTransactions.tsx`,
  `src/pages/ShoppingList.tsx`.
- Triggers: `functions/src/onLotUpdate.ts`, `functions/src/onTransactionCreate.ts`
  (see [[cloud-functions-and-triggers]]).
- Maintenance: `scripts/reconcile-inventory.mjs`.

## Rules / gotchas
- A [[lot]] is a received quantity of an ingredient at a known unit cost; lots feed
  [[weighted-average-cost]] costing in [[recipes-and-costing]].
- Transactions and lot updates fan out through Firestore triggers — reconciliation
  script exists to repair drift.
- Shopping list can be emailed/texted via the `sendShoppingList` callable
  Cloud Function (Resend / Twilio, auth-gated + rate-limited) — see
  [[0006-shopping-list-via-callable-function]]. (Was a dev-server endpoint
  until 2026-07-11; that path is retired.)

## Related
- [[system-overview]] · [[lot]] · [[weighted-average-cost]] · [[sourcing-and-vendors]]
