# Pending deletions (post-migration)

These items are kept for backward compatibility during the transition from the
legacy Recipe.ingredients field to the components model. Once migrateRecipesToV2
has been run in production and the UI has been verified against migrated data,
delete the following:

- `src/utils/recipeMath.ts` — `normalizeRecipe()` function (entire function)
- `src/utils/recipeMath.ts` — calls to `normalizeRecipe()` in `calculateRecipeCost` and `getRecipeRawIngredients` (replace `normRecipe` with the input `recipe` directly)
- `src/types.ts` — `ingredients?: RecipeIngredient[]` field on Recipe (line ~407)
- `firestore.rules` — any allowedField entry for `ingredients` on recipes

Before deletion:
1. Confirm migration ran: `await migrateRecipesToV2()` returned `liftedLegacyIngredients === 0` on a re-run (no legacy records remain)
2. Manually spot-check 3-5 recipes in Firestore — they should have `components` array and NO top-level `ingredients` field
