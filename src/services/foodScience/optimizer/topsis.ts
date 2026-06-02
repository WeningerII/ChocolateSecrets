import type { OptimizerObjective, ObjectiveWeights } from '../../../types';

interface RankInput {
  objectives: Record<OptimizerObjective, number>;
}

/**
 * TOPSIS ranking. Returns the relative closeness to the ideal solution for
 * each row, in [0..1]. Higher is better.
 *
 * Inputs are already normalized to [0..1] with higher = better, which
 * simplifies the standard TOPSIS pipeline: we skip the initial vector
 * normalization step because objectives are already on a comparable scale.
 */
export function topsisRank(
  rows: RankInput[],
  weights: ObjectiveWeights,
  activeObjectives: OptimizerObjective[]
): number[] {
  if (rows.length === 0) return [];
  if (activeObjectives.length === 0) return rows.map(() => 0);

  // Normalize weights
  const totalWeight = activeObjectives.reduce((sum, o) => sum + (weights[o] ?? 0), 0) || 1;
  const w = activeObjectives.map(o => (weights[o] ?? 0) / totalWeight);

  // Build the weighted decision matrix
  const matrix = rows.map(row =>
    activeObjectives.map((o, j) => (row.objectives[o] ?? 0) * w[j])
  );

  // Ideal (max) and anti-ideal (min) per column
  const ideal: number[] = [];
  const antiIdeal: number[] = [];
  for (let j = 0; j < activeObjectives.length; j++) {
    let max = -Infinity, min = Infinity;
    for (let i = 0; i < matrix.length; i++) {
      if (matrix[i][j] > max) max = matrix[i][j];
      if (matrix[i][j] < min) min = matrix[i][j];
    }
    ideal.push(max);
    antiIdeal.push(min);
  }

  // Closeness
  return matrix.map(row => {
    let dPos = 0, dNeg = 0;
    for (let j = 0; j < row.length; j++) {
      dPos += (row[j] - ideal[j]) ** 2;
      dNeg += (row[j] - antiIdeal[j]) ** 2;
    }
    dPos = Math.sqrt(dPos);
    dNeg = Math.sqrt(dNeg);
    return dPos + dNeg === 0 ? 0 : dNeg / (dPos + dNeg);
  });
}
