import type { FrozenComposition, FrozenWarning, ScoopabilityLevel } from './types';
import type { FrozenRecipeSubtype } from '../../../types';
import { FROZEN_BANDS_BY_SUBTYPE, SANDINESS_LACTOSE_IN_MSNF_PCT } from './constants';

interface WarningContext {
  subtype: FrozenRecipeSubtype;
  comp: FrozenComposition;
  hardeningFactor: number;
  scoopability: ScoopabilityLevel;
  hasMilkPowder: boolean;
}

export function deriveFrozenWarnings(ctx: WarningContext): FrozenWarning[] {
  const out: FrozenWarning[] = [];
  const band = FROZEN_BANDS_BY_SUBTYPE[ctx.subtype];

  // Total solids
  if (ctx.comp.totalSolidsPct < band.totalSolidsPctRange[0]) {
    out.push({
      kind: 'total_solids_low',
      ts: ctx.comp.totalSolidsPct,
      minTs: band.totalSolidsPctRange[0],
      subtype: ctx.subtype,
    });
  } else if (ctx.comp.totalSolidsPct > band.totalSolidsPctRange[1]) {
    out.push({
      kind: 'total_solids_high',
      ts: ctx.comp.totalSolidsPct,
      maxTs: band.totalSolidsPctRange[1],
      subtype: ctx.subtype,
    });
  }

  // Fat
  if (ctx.comp.fatPct < band.fatPctRange[0] || ctx.comp.fatPct > band.fatPctRange[1]) {
    out.push({
      kind: 'fat_out_of_band',
      fat: ctx.comp.fatPct,
      range: band.fatPctRange,
      subtype: ctx.subtype,
    });
  }

  // MSNF
  if (ctx.comp.msnfPct < band.msnfPctRange[0] || ctx.comp.msnfPct > band.msnfPctRange[1]) {
    out.push({
      kind: 'msnf_out_of_band',
      msnf: ctx.comp.msnfPct,
      range: band.msnfPctRange,
      subtype: ctx.subtype,
    });
  }

  // PAC
  if (ctx.comp.pac < band.pacRange[0]) {
    out.push({ kind: 'pac_low', pac: ctx.comp.pac, minPac: band.pacRange[0], subtype: ctx.subtype });
  } else if (ctx.comp.pac > band.pacRange[1]) {
    out.push({ kind: 'pac_high', pac: ctx.comp.pac, maxPac: band.pacRange[1], subtype: ctx.subtype });
  }

  // POD
  if (ctx.comp.pod < band.podRange[0] || ctx.comp.pod > band.podRange[1]) {
    out.push({ kind: 'pod_out_of_band', pod: ctx.comp.pod, range: band.podRange, subtype: ctx.subtype });
  }

  // Sandiness
  if (ctx.comp.lactoseInWaterPct > SANDINESS_LACTOSE_IN_MSNF_PCT) {
    out.push({ kind: 'sandiness_risk', lactoseInWaterPct: ctx.comp.lactoseInWaterPct });
  }

  // Sorbet with dairy present
  if ((ctx.subtype === 'sorbet' || ctx.subtype === 'granita') && ctx.comp.msnfPct > 0.5) {
    out.push({ kind: 'sorbet_dairy_present', msnf: ctx.comp.msnfPct });
  }

  // Gelato without milk powder
  if (ctx.subtype === 'gelato' && !ctx.hasMilkPowder) {
    out.push({ kind: 'gelato_no_milk_powder' });
  }

  // Scoopability extremes
  if (ctx.scoopability === 'brick') {
    out.push({ kind: 'scoopability_brick', hardening: ctx.hardeningFactor, pac: ctx.comp.pac });
  } else if (ctx.scoopability === 'too_soft') {
    out.push({ kind: 'scoopability_too_soft', hardening: ctx.hardeningFactor, pac: ctx.comp.pac });
  }

  return out;
}
