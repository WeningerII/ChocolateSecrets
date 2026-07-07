---
title: Gemini AI (server-side)
tags: [chocolatesecrets, domain]
created: 2026-07-07
updated: 2026-07-07
status: active
type: domain
---

# Gemini AI (server-side)

## What this covers
All Google Gemini usage: generation, bill/receipt extraction, and translation —
always proxied through Cloud Functions (see [[0002-gemini-server-side-only]]).

## Key code
- Functions: `functions/src/geminiGenerate.ts` (core proxy),
  `functions/src/extractBill.ts` (+ `billExtractionSchema.ts`),
  `functions/src/translation.ts`.
- Client services: `src/services/geminiService.ts`, `src/services/geminiClient.ts`
  (call the functions, never Google directly).

## Rules / gotchas
- `GEMINI_API_KEY` is a **Secret Manager** secret; never in the web build or
  `.env.local`. Validated by `scripts/check-functions-secrets.mjs`.
- Structured outputs use JSON schemas (`billExtractionSchema.ts`) — keep schema and
  parser in sync.

## Related
- [[system-overview]] · [[0002-gemini-server-side-only]] · [[expenses-bills-payments]] · [[localization-i18n]]
