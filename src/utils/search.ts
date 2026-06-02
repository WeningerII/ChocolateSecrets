/**
 * Multi-stage matching algorithm for ingredients.
 * 1. Exact Match (Case-insensitive)
 * 2. Slug Match (Normalized strings)
 * 3. Fuzzy Match (Levenshtein distance)
 */

export function findBestIngredientMatch(
  extractedName: string,
  existingIngredients: { id: string; name: string }[],
  threshold = 0.8
): { id: string; name: string; score: number } | null {
  const normalizedExtracted = extractedName.toLowerCase().trim();
  const slugExtracted = normalizedExtracted.replace(/[^a-z0-9]/g, '');

  // 1. Exact Match
  const exactMatch = existingIngredients.find(
    (i) => i.name.toLowerCase().trim() === normalizedExtracted
  );
  if (exactMatch) return { id: exactMatch.id, name: exactMatch.name, score: 1.0 };

  // 2. Slug Match
  const slugMatch = existingIngredients.find(
    (i) => i.name.toLowerCase().replace(/[^a-z0-9]/g, '') === slugExtracted
  );
  if (slugMatch) return { id: slugMatch.id, name: slugMatch.name, score: 0.95 };

  // 3. Fuzzy Match (Levenshtein)
  let bestMatch: { id: string; name: string; score: number } | null = null;
  let highestScore = 0;

  for (const ingredient of existingIngredients) {
    const score = calculateSimilarity(normalizedExtracted, ingredient.name.toLowerCase().trim());
    if (score > highestScore && score >= threshold) {
      highestScore = score;
      bestMatch = { id: ingredient.id, name: ingredient.name, score };
    }
  }

  return bestMatch;
}

export function isFuzzyMatch(s1: string, s2: string, threshold = 0.85): boolean {
  if (!s1 || !s2) return false;
  const score = calculateSimilarity(s1.toLowerCase().trim(), s2.toLowerCase().trim());
  return score >= threshold;
}

function calculateSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}
