---
title: Recipe Physics / Formulation Engine
tags: [chocolatesecrets, domain]
created: 2026-07-07
updated: 2026-07-07
status: active
type: domain
---

# Recipe Physics / Formulation Engine

## What this covers
The texture/formulation optimizer: tempering, solid-fat content, ice-fraction /
recrystallization, and food-physics modelling. This is a distinctive, heavily
hardened part of the codebase (many regression fixes: wet-bulb, freezing-point,
boiling-point elevation, meringue, jerky drying, etc.).

## Key code
- Hook: `src/hooks/useRecipePhysics.ts` (`RecipePhysics` / `useRecipePhysics`) —
  a god node.
- Engine: `src/services/foodScience/` — `universal/`, `structure/`, `process/`,
  `frozen/`, `confectionery/`, `dosing/`, `operators/`, `optimizer/`, `scenarios/`.
  `universal/types.ts` defines `ResolvedIngredient`.
- Optimizer: `src/hooks/useFormulationOptimizer.ts`, page `src/pages/lab/Formulate.tsx`.
- UI: `src/components/RecipePhysicsDetail.tsx`, `RecipePhysicsTier.tsx`.

## Rules / gotchas
- The engine has a suite of scenario benchmarks under `foodScience/scenarios/`;
  keep them green when touching physics.
- Concepts: [[tempering]], [[solid-fat-content]].
- Physics consumes resolved ingredients from [[recipes-and-costing]].

## Related
- [[system-overview]] · [[recipes-and-costing]] · [[tempering]] · [[solid-fat-content]]
