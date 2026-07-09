/**
 * Standard yields for common confection types, in finished pieces per kg of filling/batter.
 */
const TYPE_YIELD_MAP: Record<string, { piecesPerKgFilling: number; avgWeightGrams: number }> = {
  bonbon: { piecesPerKgFilling: 140, avgWeightGrams: 11 },
  molded_praline: { piecesPerKgFilling: 140, avgWeightGrams: 11 },
  truffle: { piecesPerKgFilling: 80, avgWeightGrams: 14 },
  rolled_truffle: { piecesPerKgFilling: 90, avgWeightGrams: 11 },
  dipped_truffle: { piecesPerKgFilling: 70, avgWeightGrams: 15 },
  bar: { piecesPerKgFilling: 10, avgWeightGrams: 100 },
  mendiant: { piecesPerKgFilling: 50, avgWeightGrams: 20 },
  ganache_square: { piecesPerKgFilling: 100, avgWeightGrams: 12 },
  caramel: { piecesPerKgFilling: 100, avgWeightGrams: 10 },
  marshmallow: { piecesPerKgFilling: 40, avgWeightGrams: 25 },
};

/**
 * Estimate the yield (piece count and total weight) for a recipe given its type and total filling weight.
 */
export function estimateYield(
  recipeType: string,
  totalFillingGrams: number
): { piecesEstimated: number; avgPieceWeightGrams: number; notes: string } | null {
  const typeLower = recipeType.toLowerCase();
  let key: string | null = null;
  const keys = Object.keys(TYPE_YIELD_MAP).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (typeLower.includes(k.replace('_', ' ')) || typeLower.includes(k)) {
      key = k;
      break;
    }
  }
  if (!key) return null;
  
  const { piecesPerKgFilling, avgWeightGrams } = TYPE_YIELD_MAP[key];
  const piecesEstimated = Math.round((totalFillingGrams / 1000) * piecesPerKgFilling);
  
  return {
    piecesEstimated,
    avgPieceWeightGrams: avgWeightGrams,
    notes: `Based on standard ${key.replace('_', ' ')} yield of ~${piecesPerKgFilling} pieces per kg of filling at ${avgWeightGrams}g average finished weight`,
  };
}
