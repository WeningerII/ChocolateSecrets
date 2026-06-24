/**
 * emulsify — disperse the fat and water into an emulsion. Mayonnaise, vinaigrette,
 * ganache, hollandaise, cream: oil and water forced into one phase, held by an
 * emulsifier. This step forms the emulsion from the current fat/water and reports
 * which way it sits (oil-in-water vs water-in-oil) and how stable it is, from the
 * phase-volume fraction and the emulsifier's HLB (Bancroft + close-packing).
 *
 * An assessment step: composition and temperature are unchanged (no mass moves),
 * but the emulsion state is recorded as markers so a later step (or the UI) can
 * see whether it will hold or break. Reuses computeEmulsion.
 *
 * Stability is mapped to 0..1 for the marker (none 0, unstable ¼, metastable ⅗,
 * stable 1); the categorical type/stability go in the log.
 */
import type { Operator } from './pipeline';
import { computeEmulsion, type EmulsionStability } from '../structure';

const STABILITY_SCORE: Record<EmulsionStability, number> = {
  none: 0,
  unstable: 0.25,
  metastable: 0.6,
  stable: 1,
};

export interface EmulsifyParams {
  /** Emulsifier HLB (Griffin 0–20). Omit for an unstabilized mix (will be unstable). */
  emulsifierHLB?: number;
}

export function emulsify(params: EmulsifyParams = {}): Operator {
  return (state) => {
    const em = computeEmulsion({ composition: state.composition, emulsifierHLB: params.emulsifierHLB });

    const markers = { ...state.markers };
    markers.emulsionOilFraction = em.oilPhaseFraction;
    markers.emulsionDispersedFraction = em.dispersedFraction;
    markers.emulsionStability01 = STABILITY_SCORE[em.stability];

    return {
      // No mass moves; this records the dispersed state.
      state: { ...state, markers },
      log: {
        operator: 'emulsify',
        detail: {
          type: em.type,
          stability: em.stability,
          oilFraction: Math.round(em.oilPhaseFraction * 100) / 100,
          dispersedFraction: Math.round(em.dispersedFraction * 100) / 100,
          ...(em.flags.length ? { flag: em.flags[0].kind } : {}),
        },
      },
    };
  };
}
