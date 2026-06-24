/**
 * setGel — set the liquid with a gelling agent. Panna cotta (gelatin), agar
 * terrine, pâte de fruit (HM pectin), spherification (alginate): a hydrocolloid
 * above its minimum dose builds a network that traps the liquid into a gel. This
 * step records whether it sets, its set/melt window, strength and character —
 * checking the agent's co-factor needs against the food (a high-sugar pectin needs
 * ~55 °Bx; LM pectin and alginate need calcium; kappa carrageenan needs potassium).
 *
 * The sugar co-factor (°Brix) is read from the composition's dissolved sugars;
 * calcium/potassium presence is passed in (the composition doesn't track them).
 * An assessment step: composition is unchanged (the agent dose is the input);
 * markers carry the gel strength and set/melt temperatures. Reuses computeGelation.
 */
import type { Composition } from '../../../types';
import type { Operator } from './pipeline';
import { computeGelation, type GellingAgent } from '../structure';

const SUGARS: (keyof Composition)[] = ['sucrose', 'glucose', 'fructose', 'lactose', 'maltose'];

export interface SetGelParams {
  agent: GellingAgent;
  /** Dose of the gelling agent, mass % of the system. */
  concentrationPct: number;
  /** Calcium present (for LM pectin / alginate / iota carrageenan)? */
  hasCalcium?: boolean;
  /** Potassium present (for kappa carrageenan)? */
  hasPotassium?: boolean;
}

export function setGel(params: SetGelParams): Operator {
  return (state) => {
    const sugarBrix = SUGARS.reduce((s, sp) => s + (state.composition[sp] ?? 0), 0);
    const gel = computeGelation(params.agent, params.concentrationPct, {
      sugarBrix,
      hasCalcium: params.hasCalcium,
      hasPotassium: params.hasPotassium,
    });

    const markers = { ...state.markers };
    markers.gelStrength = gel.strength;
    markers.gelSets = gel.gels ? 1 : 0;
    if (gel.setTempC != null) markers.gelSetTempC = gel.setTempC;
    if (gel.meltTempC != null) markers.gelMeltTempC = gel.meltTempC;

    return {
      // Composition unchanged (the dose is the input); this records the set behaviour.
      state: { ...state, markers },
      log: {
        operator: 'setGel',
        detail: {
          agent: params.agent,
          dosePct: Math.round(params.concentrationPct * 100) / 100,
          gels: gel.gels ? 1 : 0,
          character: gel.character,
          strength: Math.round(gel.strength * 100) / 100,
          ...(gel.flags.length ? { flag: gel.flags[0].kind } : {}),
        },
      },
    };
  };
}
