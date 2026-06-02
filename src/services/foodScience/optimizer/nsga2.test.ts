import { describe, test, expect } from 'vitest';
import { paretoRank, crowdingDistance, sbxCrossover, polynomialMutation, tournamentSelect, makeRng } from './nsga2';

describe('nsga2', () => {
  test('paretoRank assigns rank 0 to non-dominated, 1 to next', () => {
    const pop: any[] = [
      { vector: [], objectives: [1, 1] }, // rank 1
      { vector: [], objectives: [2, 2] }, // rank 0
      { vector: [], objectives: [0, 0] }, // rank 2
      { vector: [], objectives: [3, 1] }, // rank 0
    ];
    paretoRank(pop);
    expect(pop[0].paretoRank).toBe(1);
    expect(pop[1].paretoRank).toBe(0);
    expect(pop[2].paretoRank).toBe(2);
    expect(pop[3].paretoRank).toBe(0);
  });

  test('crowdingDistance assigns Infinity to boundaries', () => {
    const pop: any[] = [
      { vector: [], objectives: [1] },
      { vector: [], objectives: [2] },
      { vector: [], objectives: [3] },
    ];
    crowdingDistance(pop);
    // Sort logic inner to crowdingDistance reorders it temporarily to sort by obj[i]
    expect(pop.find(p => p.objectives[0] === 1)?.crowdingDistance).toBe(Infinity);
    expect(pop.find(p => p.objectives[0] === 3)?.crowdingDistance).toBe(Infinity);
    expect(pop.find(p => p.objectives[0] === 2)?.crowdingDistance).toBeGreaterThan(0);
    expect(pop.find(p => p.objectives[0] === 2)?.crowdingDistance).toBeLessThan(Infinity);
  });

  test('sbxCrossover identical parents', () => {
    const rng = () => 0.5;
    const [c1, c2] = sbxCrossover(0.3, 0.3, 15, rng);
    expect(c1).toBe(0.3);
    expect(c2).toBe(0.3);
  });

  test('sbxCrossover produces children in [0..1]', () => {
    const rng = () => 0.9;
    const [c1, c2] = sbxCrossover(0.1, 0.9, 15, rng);
    expect(c1).toBeGreaterThanOrEqual(0);
    expect(c1).toBeLessThanOrEqual(1);
    expect(c2).toBeGreaterThanOrEqual(0);
    expect(c2).toBeLessThanOrEqual(1);
  });

  test('polynomialMutation returns value in [0..1]', () => {
    const mut = polynomialMutation(0.5, 20, () => 0.9);
    expect(mut).toBeGreaterThanOrEqual(0);
    expect(mut).toBeLessThanOrEqual(1);
  });

  test('tournamentSelect prefers lower pareto rank', () => {
    const pop = [
      { vector: [], objectives: [], paretoRank: 0, crowdingDistance: Infinity },
      { vector: [], objectives: [], paretoRank: 1, crowdingDistance: Infinity },
    ];
    // With rng returning 0.9 for first and 0.1 for second, picks both.
    let pick0 = 0;
    const rng = () => pick0++ === 0 ? 0.9 : 0.1; 
    const winner = tournamentSelect(pop, 2, rng);
    expect(winner.paretoRank).toBe(0); // prefers rank 0
  });

});
