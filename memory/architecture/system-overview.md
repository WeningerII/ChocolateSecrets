---
title: System Overview
tags: [chocolatesecrets, architecture, moc]
created: 2026-07-07
updated: 2026-07-07
status: active
type: architecture
---

# System Overview

Map of Content (MOC) for ChocolateSecrets — start here. This is a
production-management dashboard for a chocolate/confectionery kitchen.

## Shape
- **Client:** React 19 + Vite + TypeScript + Tailwind SPA under `src/`.
  Routing via React Router 7; pages in `src/pages/`, shared UI in `src/components/`.
- **State/data:** app-wide Firestore access flows through `useData()` in
  `src/contexts/DataContext.tsx`; toasts through `useToast()`
  (`src/contexts/ToastContext.tsx`). The Firestore handle `db` and
  `handleFirestoreError()` live in `src/firebase.ts`.
- **Backend:** Firebase — Auth, **Firestore** (a *named* database), **Cloud
  Functions** (`functions/src/`), Hosting. See [[cloud-functions-and-triggers]].
- **AI:** Google **Gemini**, always proxied server-side — see [[gemini-ai-functions]]
  and the decision [[0002-gemini-server-side-only]].
- **Dev server:** `server.ts` (Express + Vite middleware) at `:3000`, plus a
  shopping-list email/SMS endpoint (Resend / Twilio).

## Core domain models (god nodes)
The most-connected symbols in the code graph (see `../graphify-out/GRAPH_REPORT.md`):
- `Ingredient`, `Recipe`, `Composition` — `src/types.ts`.
- `ResolvedIngredient` — `src/services/foodScience/universal/types.ts` (an
  ingredient resolved with food-science data).
- `RecipePhysics` / `useRecipePhysics()` — `src/hooks/useRecipePhysics.ts`, the
  texture/formulation engine ([[recipe-physics-engine]]).

## Domains (deep-dives)
- [[recipes-and-costing]] · [[recipe-physics-engine]]
- [[inventory-and-lots]] · [[sourcing-and-vendors]]
- [[expenses-bills-payments]]
- [[food-safety-allergens]]
- [[firebase-and-security]] · [[gemini-ai-functions]] · [[localization-i18n]]

## Key decisions
- [[0001-adopt-graphify-obsidian-memory]]
- [[0002-gemini-server-side-only]]
- [[0003-firestore-default-deny-rules]]

## How to explore the code
Query the graph, don't grep: `graphify query "how does X reach Firestore?"`,
`graphify explain "useData"`, `graphify path "extractBill" "recordPayment"`.
