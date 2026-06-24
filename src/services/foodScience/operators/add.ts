/**
 * add — fold another component into the food. The combine primitive that lets a
 * recipe be built up as a program: add salt, stir in cream, fold the frosting
 * into the layers. It blends a new composition + mass into the running state by
 * mass balance, and mixes temperature mass-weighted (e.g. tempering hot syrup
 * into cold eggs lands between the two).
 *
 * This is what makes the pipeline able to assemble a dish, not just transform a
 * single starting mix.
 */
import type { Composition } from '../../../types';
import type { Operator } from './pipeline';
import { speciesMassesG, massesToComposition } from './state';

export interface AddParams {
  /** Composition (mass %) of what's being added. */
  composition: Composition;
  /** Mass of the addition (g). */
  massG: number;
  /** Temperature of the addition (°C); defaults to the current state temperature. */
  tempC?: number;
  /** Optional label for the log. */
  label?: string;
}

export function add(params: AddParams): Operator {
  return (state) => {
    if (params.massG <= 0) {
      return { state, log: { operator: 'add', detail: { massG: 0, label: params.label ?? '' } } };
    }
    const masses = speciesMassesG(state);
    const addState = { composition: params.composition, massG: params.massG, tempC: 0, timeS: 0, markers: {} };
    const addMasses = speciesMassesG(addState);
    for (const sp of Object.keys(addMasses) as (keyof Composition)[]) {
      masses[sp] = (masses[sp] ?? 0) + (addMasses[sp] ?? 0);
    }

    const newMass = state.massG + params.massG;
    const addTempC = params.tempC ?? state.tempC;
    const tempC = (state.massG * state.tempC + params.massG * addTempC) / newMass;
    const composition = massesToComposition(masses, newMass);

    return {
      state: { ...state, composition, massG: newMass, tempC },
      log: {
        operator: 'add',
        detail: {
          label: params.label ?? '', massG: Math.round(params.massG * 10) / 10,
          tempC: Math.round(tempC), totalMassG: Math.round(newMass * 10) / 10,
        },
      },
    };
  };
}
