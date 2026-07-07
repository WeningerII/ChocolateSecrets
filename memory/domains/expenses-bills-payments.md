---
title: Expenses, Bills & Payments
tags: [chocolatesecrets, domain]
created: 2026-07-07
updated: 2026-07-07
status: active
type: domain
---

# Expenses, Bills & Payments

## What this covers
AI bill/receipt extraction, expense categorization, payments, and recurring-expense
expectations.

## Key code
- Page: `src/pages/Expenses.tsx`; component `src/components/ReceiptImportModal.tsx`.
- Services: `src/services/billsService.ts`, `src/services/paymentsService.ts`,
  `src/services/recurringExpectationsService.ts`.
- Functions: `functions/src/extractBill.ts` (+ `billExtractionSchema.ts`) →
  `onBillReviewed.ts` → `recordPayment.ts` (+ `paymentTypes.ts`); scheduled
  `dailyExpenseCheck.ts`.
- Seed: `scripts/seed-expense-categories.mjs`.

## Flow
1. Upload a bill image → `extractBill` (Gemini, server-side — see
   [[gemini-ai-functions]]) returns structured line items.
2. Human reviews → `onBillReviewed` trigger → `recordPayment`.
3. Vendors normalized via [[sourcing-and-vendors]].

## Related
- [[system-overview]] · [[gemini-ai-functions]] · [[sourcing-and-vendors]]
