/**
 * aerate — whip air into the food (overrun). Whipping cream, meringue, mousse,
 * the overrun churned into ice cream: gas is folded in, volume grows, density
 * falls. Mass is essentially unchanged (air is ~weightless); what changes is the
 * overrun (% volume increase) and the resulting density.
 *
 * How much air a food will hold is bounded by what stabilizes the foam:
 *   - protein (the foam kernel's foamability) — egg-white meringue reaches
 *     several hundred percent overrun;
 *   - or fat in the whippable window (~20–55 %) — whipped cream's fat-stabilized
 *     foam reaches ~100 %.
 * The requested overrun is delivered only up to that capability.
 *
 * Calibrated (the overrun ceilings are representative). Reuses computeFoam.
 */
import type { Operator } from './pipeline';
import { computeFoam } from '../structure';

export type AerateFlag = { kind: 'cannot_aerate' } | { kind: 'aeration_limited' };

export interface AerateParams {
  /** Target overrun (% volume increase): 100 doubles the volume. */
  targetOverrunPct: number;
}

export function aerate(params: AerateParams): Operator {
  return (state) => {
    const foam = computeFoam(state.composition);
    const fat = state.composition.fat ?? 0;
    // Fat antagonizes protein foams (same scale as computeFoam's FAT_PENALTY_SCALE).
    const fatPenalty = 1 - Math.min(0.8, fat / 25);
    const proteinCap = foam.foamability * fatPenalty * 350;    // protein foam, fat-penalised
    const fatCap = fat >= 20 && fat <= 55 ? 120 : 0;            // whippable fat foam
    const capability = Math.max(proteinCap, fatCap);

    const achieved = Math.max(0, Math.min(params.targetOverrunPct, capability));
    const flags: AerateFlag[] = [];
    if (capability < 1) flags.push({ kind: 'cannot_aerate' });
    else if (achieved < params.targetOverrunPct - 1) flags.push({ kind: 'aeration_limited' });

    const markers = { ...state.markers };
    markers.overrunPct = achieved;
    markers.densityFactor = 1 / (1 + achieved / 100); // fraction of un-aerated density

    return {
      // Mass unchanged (air is ~weightless); composition fractions unchanged.
      state: { ...state, markers },
      log: {
        operator: 'aerate',
        detail: {
          targetOverrunPct: Math.round(params.targetOverrunPct),
          achievedOverrunPct: Math.round(achieved),
          foamBand: foam.band,
          ...(flags.length ? { flag: flags[0].kind } : {}),
        },
      },
    };
  };
}
