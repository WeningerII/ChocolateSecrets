---
title: ADR-0004 — Decompose god modules into behavior-preserving barrels
tags: [chocolatesecrets, decision, refactor, architecture]
created: 2026-07-07
updated: 2026-07-07
status: active
type: decision
---

# ADR-0004 — Decompose god modules into behavior-preserving barrels

## Context
Three files had grown into "god modules" — the two most-connected file nodes in
the Graphify code graph plus the app's largest editor component. They mixed many
unrelated concerns in a single file, inflating their fan-in and making them hard
to navigate and review:

- `src/types.ts` — 1183 LOC, every domain type in one file; the highest-degree
  file node in the graph (273 edges).
- `src/services/culinaryTools.ts` — 1396 LOC of unrelated food-science helpers
  (allergens, chocolate, equipment, dairy, yield, ingredient specs); 51 edges.
- `src/components/RecipeEditor.tsx` — 1682 LOC mixing reducer state logic with a
  large JSX tree.

See [[system-overview]] for how these sit in the app, and
[[recipes-and-costing]] for the domain they serve.

## Decision
Split each god module into focused domain sub-modules, and keep the original
path as a **thin re-export barrel** so no import site changed — a purely
structural, behavior-preserving refactor. Every split was gated on
`npm run lint` (tsc `--noEmit`) **and** `npm test` (vitest) staying green.

### What was split into what
- **`src/types.ts`** (barrel, 1183 → 23 LOC) now re-exports 16 domain modules
  under `src/types/`: `i18n.ts`, `common.ts`, `allergens.ts`, `composition.ts`,
  `chocolate.ts`, `roles.ts`, `categories.ts`, `dsl.ts`, `inventory.ts`,
  `ingredient.ts`, `recipe.ts`, `sourcing.ts`, `production.ts`, `optimizer.ts`,
  `expenses.ts`, `alerts.ts`.
- **`src/services/culinaryTools.ts`** (barrel, 1396 → 13 LOC) now re-exports 6
  modules under `src/services/culinary/`: `allergens.ts`, `chocolate.ts`,
  `equipment.ts`, `dairy.ts`, `yield.ts`, `ingredientSpec.ts`.
- **`src/components/RecipeEditor.tsx`** (1682 → 1445 LOC) had its reducer/state
  logic extracted to `src/components/recipeEditor/recipeEditor.types.ts` and
  `src/components/recipeEditor/recipeReducer.ts`. (JSX decomposition was
  deliberately deferred — see [[refactor-backlog]].)

## Why
- **Barrel-preserving** — re-exporting from the original path means zero churn at
  ~hundreds of import sites and zero runtime behavior change, so the diff is safe
  to land without a UI pass.
- **Lint + test gated** — both suites (tsc + 891 vitest tests across 97 files)
  stayed green before and after each split.
- **Lower fan-in on hub files** — a god module concentrates unrelated edges; the
  barrel now delegates, so structural coupling moves onto the real sub-modules.

## Measured reduction
- **LOC (barrel shrink):** `types.ts` 1183 → 23; `culinaryTools.ts` 1396 → 13;
  `RecipeEditor.tsx` 1682 → 1445 (reducer extracted).
- **Graph degree (Graphify `explain`, before → after rebuild):**
  `src/types.ts` **273 → 196** (−77); `src/services/culinaryTools.ts`
  **51 → 17** (−34). New sub-modules absorbed the coupling
  (e.g. `types/ingredient.ts` 18, `culinary/chocolate.ts` 14).
- The graph was rebuilt with `graphify update .` at commit `47af38ac`
  (1791 nodes · 4956 edges). The symbol-level "God Nodes" top-10 (`Ingredient`,
  `Recipe`, …) is unchanged in membership; the shrink shows on the **file** nodes.

## Consequences
- New types/helpers should be added to the appropriate `src/types/*` or
  `src/services/culinary/*` module, not the barrel.
- The barrels (`types.ts`, `culinaryTools.ts`) must stay pure re-export — no
  logic — so they remain thin.
- Run `graphify update .` after further splits to keep degrees accurate.

## Related
- [[system-overview]] · [[recipes-and-costing]] · [[refactor-backlog]]
