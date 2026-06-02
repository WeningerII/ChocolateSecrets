import type { Recipe, Ingredient, RecipeCategory, FrozenRecipeSubtype } from '../types';

export interface CategoryInferenceResult {
  categories: RecipeCategory[];
  frozenSubtype?: FrozenRecipeSubtype;
}

export function inferRecipeCategories(
  recipe: Pick<Recipe, 'name' | 'components'>,
  ingredientCatalog: Map<string, Ingredient>
): CategoryInferenceResult {
  const categories: RecipeCategory[] = [];
  let frozenSubtype: FrozenRecipeSubtype | undefined;
  const name = (recipe.name ?? '').toLowerCase();

  // Confectionery
  const hasChocolate = (recipe.components ?? []).some(c =>
    (c.ingredients ?? []).some(ri => {
      if (!ri.ingredientId) return false;
      const ing = ingredientCatalog.get(ri.ingredientId);
      return !!ing?.chocolateSpec;
    })
  );
  const confectioneryNamePattern =
    /\b(ganache|truffle|bonbon|caramel|nougat|fondant|marshmallow|fudge|praline|gianduja|enrobed)\b/.test(name);
  if (hasChocolate || confectioneryNamePattern) categories.push('confectionery');

  // Frozen
  if (/\b(ice cream|gelato|sorbet|sherbet|semifreddo|granita|frozen yogurt|sundae|froyo|helado)\b/.test(name)) {
    categories.push('frozen');
    if (/\bgranita\b/.test(name)) frozenSubtype = 'granita';
    else if (/\bsorbet|sorbetto|granizado\b/.test(name)) frozenSubtype = 'sorbet';
    else if (/\bsherbet|sherbert\b/.test(name)) frozenSubtype = 'sherbet';
    else if (/\bsemifreddo\b/.test(name)) frozenSubtype = 'semifreddo';
    else if (/\bfrozen yogurt|yogurt helado|froyo\b/.test(name)) frozenSubtype = 'frozen_yogurt';
    else if (/\bgelato|helado artesanal\b/.test(name)) frozenSubtype = 'gelato';
    else if (/\bice cream|ice-cream|helado\b/.test(name)) frozenSubtype = 'ice_cream';
  }

  // Bread
  const hasFlour = (recipe.components ?? []).some(c =>
    (c.ingredients ?? []).some(ri => ri.role?.universal === 'flour_starch')
  );
  const hasLeavener = (recipe.components ?? []).some(c =>
    (c.ingredients ?? []).some(ri => ri.role?.universal === 'leavener')
  );
  if (hasFlour && hasLeavener) categories.push('bread');

  return { categories, frozenSubtype };
}
