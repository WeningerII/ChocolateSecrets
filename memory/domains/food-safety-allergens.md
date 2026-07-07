---
title: Food Safety & Allergens
tags: [chocolatesecrets, domain]
created: 2026-07-07
updated: 2026-07-07
status: active
type: domain
---

# Food Safety & Allergens

## What this covers
Allergen tracking and cross-contact risk — first-class data attached to
ingredients and recipes, not an afterthought.

## Key code
- Allergen / [[cross-contact]] info is carried through `src/services/culinaryTools.ts`
  and surfaced in `src/components/RecipeEditor.tsx` / recipe warnings.
- AI-assisted allergen inference passes through `src/services/geminiService.ts`
  (server-side — see [[gemini-ai-functions]]).
- Migration: `scripts/migrate-cross-contact-risks.mjs` (data-model evolution).
- Labels live in localized strings (`src/locales/*/ingredients.json`,
  `enums.json`) — see [[localization-i18n]].

## Rules / gotchas
- Cross-contact is modelled as risk data on ingredients; recipes inherit/aggregate
  it. Treat changes as safety-critical — keep migrations reversible and audited.
- To find exact call sites, ask the graph:
  `graphify query "where is allergen / cross-contact handled?"`.

## Related
- [[system-overview]] · [[cross-contact]] · [[recipes-and-costing]]
