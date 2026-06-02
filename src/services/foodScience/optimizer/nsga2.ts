import type { DecisionVector } from '../../../types';

export interface IndividualScored {
  vector: DecisionVector;          // genes in [0..1]
  objectives: number[];            // higher is better; objective array aligned to active list
  paretoRank?: number;
  crowdingDistance?: number;
}

export interface Nsga2Config {
  populationSize: number;
  generations: number;
  crossoverRate: number;
  mutationRate: number;
  sbxEta: number;
  polynomialEta: number;
  tournamentSize: number;
  geneCount: number;
}

export const NSGA2_DEFAULTS: Nsga2Config = {
  populationSize: 40,
  generations: 50,
  crossoverRate: 0.85,
  mutationRate: 0.15,
  sbxEta: 15,
  polynomialEta: 20,
  tournamentSize: 2,
  geneCount: 0,
};

/**
 * Returns the indices of individuals in the non-dominated front of `pop`,
 * along with their ranks. Subsequent fronts are 1, 2, ...
 *
 * Higher objective values dominate (we maximize).
 */
export function paretoRank(pop: IndividualScored[]): IndividualScored[] {
  const n = pop.length;
  const dominationCount = new Array<number>(n).fill(0);
  const dominated = Array.from({ length: n }, () => [] as number[]);

  for (let p = 0; p < n; p++) {
    for (let q = 0; q < n; q++) {
      if (p === q) continue;
      if (dominates(pop[p].objectives, pop[q].objectives)) {
        dominated[p].push(q);
      } else if (dominates(pop[q].objectives, pop[p].objectives)) {
        dominationCount[p] += 1;
      }
    }
  }

  let currentFront: number[] = [];
  for (let i = 0; i < n; i++) {
    if (dominationCount[i] === 0) {
      pop[i].paretoRank = 0;
      currentFront.push(i);
    }
  }

  let rank = 0;
  while (currentFront.length > 0) {
    const next: number[] = [];
    for (const p of currentFront) {
      for (const q of dominated[p]) {
        dominationCount[q] -= 1;
        if (dominationCount[q] === 0) {
          pop[q].paretoRank = rank + 1;
          next.push(q);
        }
      }
    }
    rank += 1;
    currentFront = next;
  }

  return pop;
}

function dominates(a: number[], b: number[]): boolean {
  let strictlyBetter = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return false;        // a worse on at least one objective
    if (a[i] > b[i]) strictlyBetter = true;
  }
  return strictlyBetter;
}

/**
 * Crowding distance computed per front. Boundary individuals get Infinity.
 */
export function crowdingDistance(individualsInFront: IndividualScored[]): void {
  const m = individualsInFront[0]?.objectives.length ?? 0;
  for (const ind of individualsInFront) ind.crowdingDistance = 0;
  if (individualsInFront.length <= 2) {
    for (const ind of individualsInFront) ind.crowdingDistance = Infinity;
    return;
  }
  for (let i = 0; i < m; i++) {
    individualsInFront.sort((a, b) => a.objectives[i] - b.objectives[i]);
    const min = individualsInFront[0].objectives[i];
    const max = individualsInFront[individualsInFront.length - 1].objectives[i];
    const span = max - min || 1;
    individualsInFront[0].crowdingDistance = Infinity;
    individualsInFront[individualsInFront.length - 1].crowdingDistance = Infinity;
    for (let k = 1; k < individualsInFront.length - 1; k++) {
      individualsInFront[k].crowdingDistance! +=
        (individualsInFront[k + 1].objectives[i] - individualsInFront[k - 1].objectives[i]) / span;
    }
  }
}

/**
 * Crowded comparison operator. Returns true if a is preferred over b.
 */
function preferred(a: IndividualScored, b: IndividualScored): boolean {
  if ((a.paretoRank ?? Infinity) < (b.paretoRank ?? Infinity)) return true;
  if ((a.paretoRank ?? Infinity) > (b.paretoRank ?? Infinity)) return false;
  return (a.crowdingDistance ?? -Infinity) > (b.crowdingDistance ?? -Infinity);
}

export function tournamentSelect(pop: IndividualScored[], k: number, rng: () => number): IndividualScored {
  let winner = pop[Math.floor(rng() * pop.length)];
  for (let i = 1; i < k; i++) {
    const challenger = pop[Math.floor(rng() * pop.length)];
    if (preferred(challenger, winner)) winner = challenger;
  }
  return winner;
}

/** Simulated Binary Crossover (Deb 1995) on a [0..1] gene. */
export function sbxCrossover(p1: number, p2: number, eta: number, rng: () => number): [number, number] {
  if (Math.abs(p1 - p2) < 1e-9) return [p1, p2];
  const u = rng();
  const beta = u <= 0.5
    ? Math.pow(2 * u, 1 / (eta + 1))
    : Math.pow(1 / (2 * (1 - u)), 1 / (eta + 1));
  let c1 = 0.5 * ((1 + beta) * p1 + (1 - beta) * p2);
  let c2 = 0.5 * ((1 - beta) * p1 + (1 + beta) * p2);
  c1 = Math.max(0, Math.min(1, c1));
  c2 = Math.max(0, Math.min(1, c2));
  return [c1, c2];
}

/** Polynomial mutation on a [0..1] gene. */
export function polynomialMutation(x: number, eta: number, rng: () => number): number {
  const u = rng();
  const delta = u < 0.5
    ? Math.pow(2 * u, 1 / (eta + 1)) - 1
    : 1 - Math.pow(2 * (1 - u), 1 / (eta + 1));
  return Math.max(0, Math.min(1, x + delta));
}

export function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
