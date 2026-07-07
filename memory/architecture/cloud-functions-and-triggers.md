---
title: Cloud Functions & Firestore Triggers
tags: [chocolatesecrets, architecture]
created: 2026-07-07
updated: 2026-07-07
status: active
type: architecture
---

# Cloud Functions & Firestore Triggers

Server-side logic lives in `functions/src/` (Node 20). Two shapes: **callable/HTTP**
functions the client invokes, and **Firestore triggers** that react to writes.

## AI proxies (callable)
- `geminiGenerate.ts` — the single Gemini entry point; reads `GEMINI_API_KEY` from
  Secret Manager. See [[gemini-ai-functions]] and [[0002-gemini-server-side-only]].
- `extractBill.ts` (+ `billExtractionSchema.ts`) — extract structured data from a
  bill/receipt image. Feeds [[expenses-bills-payments]].
- `translation.ts` — batch UI/recipe translation. See [[localization-i18n]].

## Triggers (react to Firestore writes)
- `onLotUpdate.ts` — reacts to inventory lot changes. See [[inventory-and-lots]].
- `onTransactionCreate.ts` — inventory transaction side effects.
- `onBillReviewed.ts` — once a bill is reviewed, records payment via
  `recordPayment.ts`. See [[expenses-bills-payments]].
- `dailyExpenseCheck.ts` — scheduled expense/expectation reconciliation.

## Vendor resolution
- `resolveVendor.ts`, `vendorResolution.ts` — normalize vendors extracted from
  bills into canonical suppliers. See [[sourcing-and-vendors]].

## Notes
- `functions/src/index.ts` is the export barrel (what actually deploys).
- Secrets are validated by `scripts/check-functions-secrets.mjs`.
- Deploy: `npm --prefix functions ci && npm --prefix functions run build` then
  `firebase deploy --only functions`.

## Related
- [[system-overview]] · [[firebase-and-security]]
