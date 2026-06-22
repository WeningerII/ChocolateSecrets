# Pending deletions (post-migration)

**Status: completed 2026-06-22.** The legacy `Recipe.ingredients` field and its
read-time fallback have been removed now that recipes use the components model.

⚠️ **Production gate:** this removal assumes production has no recipe that still
relies on the legacy `ingredients`-only shape. Before this lands in production,
confirm the migration has run there:

1. `await migrateRecipesToV2()` returns `liftedLegacyIngredients === 0` on a re-run
   (no legacy records remain) — run it from **Restaurant Settings → Run recipe migration**.
2. Spot-check 3-5 recipes in Firestore — each should have a `components` array and
   no top-level `ingredients` field.

## What was removed

- `src/utils/recipeMath.ts` — the `normalizeRecipe()` function and its calls in
  `calculateRecipeCost` and `getRecipeRawIngredients` (now use `recipe` directly).
- `src/utils/resolveRecipeLeaves.ts` — the third `normalizeRecipe()` caller (this
  one was **not** listed in the original note; found via a full-codebase sweep).
- `src/types.ts` — the `ingredients?: RecipeIngredient[]` field on `Recipe`.
- `firestore.rules` — `'ingredients'` removed from the recipe allowed-fields list
  **and** the `(!('ingredients' in data) || data.ingredients is list)` validation line.

## Intentionally kept

- `migrateRecipesToV2()` (`src/utils/recipeMigration.ts`) still lifts any straggler
  legacy docs and is reachable from the admin UI. Because the `Recipe` type no longer
  declares `ingredients`, it reads the field through a local legacy-aware cast.
