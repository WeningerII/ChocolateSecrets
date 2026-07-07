---
title: ADR-0002 — Gemini runs server-side only
tags: [chocolatesecrets, decision]
created: 2026-07-07
updated: 2026-07-07
status: active
type: decision
---

# ADR-0002 — Gemini runs server-side only

## Context
The app uses Google Gemini for generation, bill/receipt extraction, and
translation. An API key in the browser bundle would be trivially exfiltrated and
abused.

## Decision
All Gemini calls are **proxied through Cloud Functions**
(`functions/src/geminiGenerate.ts`, `extractBill.ts`, `translation.ts`). The
`GEMINI_API_KEY` lives in **Secret Manager** and never reaches the client. The web
build must **not** define `GEMINI_API_KEY` or `VITE_GEMINI_API_KEY`.

## Consequences
- AI features require the functions deployed and the secret set
  (`firebase functions:secrets:set GEMINI_API_KEY`); validated by
  `scripts/check-functions-secrets.mjs`.
- Client talks to our functions, not Google directly — one throttling/auditing point.

## Related
- [[gemini-ai-functions]] · [[cloud-functions-and-triggers]] · [[system-overview]]
