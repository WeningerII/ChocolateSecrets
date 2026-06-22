/**
 * Assemble a process timeline T(t) from recipe data, so the kinetic models have
 * something to integrate over.
 */
import type { RecipeStep } from '../../../types';
import type { ProcessProfile, ProcessSegment } from './types';

/**
 * Build a process profile from a component's steps. Only steps that declare BOTH
 * a target temperature and a positive duration contribute a thermal leg — a
 * "mix 2 min" step with no temperature is ambient and reaction-irrelevant, so it
 * is skipped rather than guessed at. Steps are read in `order`.
 */
export function buildProcessProfile(steps: readonly RecipeStep[]): ProcessProfile {
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  const segments: ProcessSegment[] = [];
  for (const step of ordered) {
    const tempC = step.parameters?.temperatureTarget;
    const durationS = step.parameters?.durationSeconds;
    if (typeof tempC !== 'number' || typeof durationS !== 'number' || durationS <= 0) {
      continue;
    }
    segments.push({
      tempC,
      durationS,
      actionType: String(step.actionType),
      label: step.title,
    });
  }
  return finalizeProfile(segments);
}

/**
 * Build a profile directly from explicit segments — for scenarios that are not
 * recipe steps, e.g. a storage timeline (20 °C for 30 days) for oxidation.
 */
export function profileFromSegments(segments: readonly ProcessSegment[]): ProcessProfile {
  return finalizeProfile(segments.filter((s) => s.durationS > 0));
}

function finalizeProfile(segments: ProcessSegment[]): ProcessProfile {
  const totalDurationS = segments.reduce((sum, s) => sum + s.durationS, 0);
  return { segments, totalDurationS };
}
