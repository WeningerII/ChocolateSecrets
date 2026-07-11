---
title: ADR-0006 — Shopping-list send moves to an authenticated callable Cloud Function
tags: [chocolatesecrets, decision, architecture, functions]
created: 2026-07-11
updated: 2026-07-11
status: active
type: decision
---

# ADR-0006 — Shopping-list send moves to an authenticated callable Cloud Function

## Context
"Send to Chef" (`src/pages/PrepList.tsx`) POSTs to `/api/send-shopping-list`,
which exists only in the Express dev server (`server.ts`). Both production
deploys (Firebase Hosting, GitHub Pages) are static, so the feature is dead in
prod; the dev endpoint is also unauthenticated and unrate-limited, with a
Resend sandbox sender that cannot deliver to arbitrary recipients
([[project-backlog]], section A).

## Decision
Port the feature to a **callable Cloud Function** (`sendShoppingList` in
`functions/src/`), chosen by the owner 2026-07-11 over hide-in-prod/removal:
- Callable = Firebase Auth context for free (guests allowed per [[0005-keep-anonymous-guest-mode]]
  is a separate posture question; the callable should at minimum require
  `request.auth`), plus App Check enforcement when that lands.
- `RESEND_API_KEY` / `TWILIO_*` / `CHEF_*` move to Secret Manager function
  secrets, consistent with [[0002-gemini-server-side-only]]'s pattern of
  keeping keys out of the web build.
- Works identically on Firebase Hosting and GitHub Pages (callables hit
  cloudfunctions.net directly — no hosting rewrite needed).

## Consequences
- `PrepList.tsx` switches from `fetch('/api/…')` to `httpsCallable`.
- The dev-server endpoint (and its `/api` route) is retired; `server.ts`
  becomes Vite middleware only. The undocumented `npm start` production branch
  should be deleted or documented at the same time.
- A verified Resend sender/domain must replace `onboarding@resend.dev` for
  real delivery; message body is server-templated (client free-text dropped
  or length-capped) to close the relay/injection concern.
- Server must report per-channel success honestly (no 200-on-failure).

## Related
- [[project-backlog]] · [[0002-gemini-server-side-only]] · [[inventory-and-lots]]
