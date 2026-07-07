---
title: Recipes & Costing
tags: [chocolatesecrets, domain]
created: 2026-07-07
updated: 2026-07-07
status: active
type: domain
---

# Recipes & Costing

## What this covers
Authoring recipes (components/sub-recipes), computing plate/batch cost, and the
recipe audit view. The core models `Recipe`, `Composition`, and `Ingredient` are
in `src/types.ts`.

## Key code
- Pages: `src/pages/Recipes.tsx`, `RecipeDetail.tsx`, `RecipeEditPage.tsx`,
  `RecipeAudit.tsx`, `RecipeCookingMode.tsx`.
- Components: `src/components/RecipeEditor.tsx`, `RecipeCostDrivers.tsx`,
  `RecipeOutputStrip.tsx`, `RecipeWarningsList.tsx`.
- Logic: `src/services/culinaryTools.ts` (costing/yield math; also carries
  allergen/cross-contact info — see [[food-safety-allergens]]).
- Ingredient resolution feeds physics via [[recipe-physics-engine]].

## Rules / gotchas
- Costing uses [[weighted-average-cost]] (WAC) over ingredient lots — see
  [[inventory-and-lots]].
- Recipes can nest (sub-recipes/components); cost rolls up through compositions.
- Ingredient prices come from received goods; USDA food data enriches nutrition
  via `src/services/usdaFoodData.ts`.

## Related
- [[system-overview]] · [[recipe-physics-engine]] · [[weighted-average-cost]]
