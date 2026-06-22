/**
 * Time·temperature process layer — the shared substrate for reaction-kinetic
 * models (Maillard browning now; thermal doneness, lipid oxidation and moisture
 * migration next).
 *
 * The static-composition kernels (Aw, freezing, pH, …) answer "what IS the
 * recipe?". This layer answers "what does heating or holding it over time DO to
 * it?" — the extent of a temperature-driven reaction is the integral of its rate
 * along the process timeline T(t). A recipe already encodes that timeline:
 * `component.steps[]`, ordered by `order`, where each step's
 * `parameters.temperatureTarget` and `parameters.durationSeconds` give one
 * held-temperature leg.
 */

/** One held-temperature leg of a process timeline. */
export interface ProcessSegment {
  /** Segment temperature (°C). */
  tempC: number;
  /** Time held at this temperature (seconds). */
  durationS: number;
  /** Provenance: the step actionType this leg came from (defaults/debugging). */
  actionType?: string;
  /** Human label for the leg (the step title), for explanations. */
  label?: string;
}

/** An ordered temperature timeline a reaction integrates over. */
export interface ProcessProfile {
  segments: ProcessSegment[];
  /** Σ of segment durations (seconds). */
  totalDurationS: number;
}

/**
 * A relative reaction-rate model: maps temperature (°C) to a DIMENSIONLESS rate
 * normalized to 1.0 at the model's reference temperature. The integrator
 * multiplies this by each segment's duration and sums, yielding "equivalent
 * seconds at the reference temperature" (a cook-value) — independent of the
 * absolute pre-exponential constants we rarely know for food reactions.
 */
export type RelativeRateModel = (tempC: number) => number;
