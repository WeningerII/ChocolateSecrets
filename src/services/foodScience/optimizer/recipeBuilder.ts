import type {
  Recipe, RecipeIngredient, Ingredient, SearchDimension, OptimizerCandidate,
} from '../../../types';

/**
 * Decode a vector of normalized [0..1] genes against the search space, applying
 * each dimension's transform to a clone of the base recipe. Returns the
 * candidate recipe and a human-readable diff list.
 */
export function applyDecisionVector(
  baseRecipe: Recipe,
  vector: number[],
  dimensions: SearchDimension[],
  catalog: Ingredient[]
): { recipe: Recipe; diff: OptimizerCandidate['diff'] } {
  const catalogById = new Map(catalog.map(i => [i.id, i]));
  // Deep-clone components and their ingredients
  const components = (baseRecipe.components ?? []).map(c => ({
    ...c,
    ingredients: (c.ingredients ?? []).map(ri => ({ ...ri })),
  }));
  const diff: OptimizerCandidate['diff'] = [];

  let geneIdx = 0;
  for (const dim of dimensions) {
    switch (dim.kind) {
      case 'continuous_mass': {
        const gene = clamp01(vector[geneIdx++]);
        const newMass = dim.minMass + (dim.maxMass - dim.minMass) * gene;
        const ri = components[dim.componentIndex].ingredients[dim.ingredientIndex];
        if (ri && Math.abs(newMass - dim.baseMass) > 0.5) {
          diff.push({
            kind: 'mass_changed',
            ingredientName: catalogById.get(ri.ingredientId ?? '')?.name ?? ri.name ?? '',
            from: dim.baseMass,
            to: newMass,
          });
        }
        if (ri) ri.quantity = newMass;
        break;
      }

      case 'parametric_choice': {
        const gene = clamp01(vector[geneIdx++]);
        const idx = Math.min(dim.options.length - 1, Math.floor(gene * dim.options.length));
        const targetCocoa = dim.options[idx];
        const ri = components[dim.componentIndex].ingredients[dim.ingredientIndex];
        if (!ri || !ri.ingredientId) break;
        const baseIng = catalogById.get(ri.ingredientId);
        if (!baseIng?.chocolateSpec) break;
        if (Math.abs(baseIng.chocolateSpec.cocoaPercentage! - targetCocoa) < 1) break;

        // Find a substitute chocolate of the same type with cocoa% near the target
        const substitute = [...catalog]
          .filter(i => i.chocolateSpec?.type === baseIng.chocolateSpec?.type)
          .filter(i => i.chocolateSpec?.cocoaPercentage !== undefined)
          .sort((a, b) =>
            Math.abs(a.chocolateSpec!.cocoaPercentage! - targetCocoa)
            - Math.abs(b.chocolateSpec!.cocoaPercentage! - targetCocoa)
          )[0];
        if (!substitute || substitute.id === ri.ingredientId) break;

        diff.push({
          kind: 'cocoa_changed',
          from: baseIng.chocolateSpec.cocoaPercentage!,
          to: substitute.chocolateSpec!.cocoaPercentage!,
        });
        ri.ingredientId = substitute.id;
        ri.name = substitute.name;
        break;
      }

      case 'discrete_swap': {
        const gene = clamp01(vector[geneIdx++]);
        const idx = Math.min(
          dim.candidateIngredientIds.length - 1,
          Math.floor(gene * dim.candidateIngredientIds.length)
        );
        const chosenId = dim.candidateIngredientIds[idx];
        const ri = components[dim.componentIndex].ingredients[dim.ingredientIndex];
        if (!ri || !ri.ingredientId || ri.ingredientId === chosenId) break;
        const oldName = catalogById.get(ri.ingredientId)?.name ?? '';
        const newIng = catalogById.get(chosenId);
        if (!newIng) break;
        diff.push({ kind: 'swapped', from: oldName, to: newIng.name, mass: ri.quantity });
        ri.ingredientId = chosenId;
        ri.name = newIng.name;
        break;
      }

      case 'presence_with_variant': {
        // Three genes: presence flag, variant choice, mass. All three are read
        // before any early break so geneIdx stays aligned for later dimensions.
        const presenceGene = clamp01(vector[geneIdx++]);
        const choiceGene = clamp01(vector[geneIdx++]);
        const massGene = clamp01(vector[geneIdx++]);
        const isPresent = presenceGene > 0.5;
        if (!isPresent) break;

        const choiceIdx = Math.min(
          dim.candidateIngredientIds.length - 1,
          Math.floor(choiceGene * dim.candidateIngredientIds.length)
        );
        const chosenId = dim.candidateIngredientIds[choiceIdx];
        const newMass = dim.maxMass * massGene;
        if (newMass < 0.5) break;

        const newIng = catalogById.get(chosenId);
        if (!newIng) break;
        components[dim.componentIndex].ingredients.push({
          type: 'ingredient',
          ingredientId: chosenId,
          name: newIng.name,
          quantity: newMass,
          unit: 'g',
          status: 'pending',
        } as RecipeIngredient);
        diff.push({ kind: 'added', ingredientName: newIng.name, mass: newMass });
        break;
      }

      case 'continuous_pct_of_role': {
        // Reserved for future use; not produced by deriveSearchSpace yet
        geneIdx += 1;
        break;
      }
    }
  }

  return {
    recipe: { ...baseRecipe, components, id: baseRecipe.id },   // id stays as-is for now (worker doesn't write)
    diff,
  };
}

function clamp01(x: number): number {
  if (isNaN(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
