import type { StepCondition, ContextSlot, SlotFormatter } from '../../../types';
import type { ResolvedIngredient, AwResult, PHResult, FatRegime, AwBandKey, FatRegimeKey } from '../universal';
import type { ConfectioneryEvaluation } from './types';

// =====================================================================
// Evaluation context — the hook hands this in
// =====================================================================

export interface DslContext {
  aw: AwResult;
  pH: PHResult | null;
  fatRegime: FatRegime;
  awBandKey: AwBandKey;
  shelfLifeWeeks: number;
  resolved: ResolvedIngredient[];
  confectionery: ConfectioneryEvaluation | null;
}

// =====================================================================
// Predicate evaluator
// =====================================================================

const RISK_RANK: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3 };

export function evaluateStepCondition(cond: StepCondition, ctx: DslContext): boolean {
  switch (cond.kind) {
    case 'always': return true;

    case 'role_present':
      return ctx.resolved.some(r => r.role === cond.role && r.mass > 0);

    case 'role_absent':
      return !ctx.resolved.some(r => r.role === cond.role && r.mass > 0);

    case 'role_quantity': {
      const total = ctx.resolved
        .filter(r => r.role === cond.role)
        .reduce((s, r) => s + r.mass, 0);
      return compareNumbers(total, cond.op, cond.grams);
    }

    case 'physics_compare': {
      const v = readPhysicsMetric(ctx, cond.metric);
      if (v === null) return false;
      return compareNumbers(v, cond.op, cond.value);
    }

    case 'aw_band': {
      const targets = Array.isArray(cond.band) ? cond.band : [cond.band];
      return targets.includes(ctx.awBandKey as any);
    }

    case 'fat_regime': {
      const targets = Array.isArray(cond.regime) ? cond.regime : [cond.regime];
      return targets.includes(ctx.fatRegime.key as any);
    }

    case 'curdle_risk': {
      if (!ctx.confectionery) return false;
      return RISK_RANK[ctx.confectionery.derived.curdle.level] >= RISK_RANK[cond.min];
    }

    case 'category_subtype_present': {
      if (!ctx.confectionery) return false;
      return Object.values(ctx.confectionery.derived.subtypes).includes(cond.subtype as any);
    }

    case 'and': return cond.conditions.every(c => evaluateStepCondition(c, ctx));
    case 'or':  return cond.conditions.some(c => evaluateStepCondition(c, ctx));
    case 'not': return !evaluateStepCondition(cond.condition, ctx);
  }
}

function compareNumbers(a: number, op: '<' | '<=' | '=' | '>=' | '>', b: number): boolean {
  switch (op) {
    case '<':  return a < b;
    case '<=': return a <= b;
    case '=':  return Math.abs(a - b) < 1e-9;
    case '>=': return a >= b;
    case '>':  return a > b;
  }
}

function readPhysicsMetric(ctx: DslContext, metric: 'aw' | 'pH' | 'fatPct' | 'aqueousSugarPct'): number | null {
  switch (metric) {
    case 'aw': return ctx.aw.aw;
    case 'pH': return ctx.pH?.pH ?? null;
    case 'fatPct': return ctx.aw.fatPct;
    case 'aqueousSugarPct': return ctx.aw.aqueousSugarPct;
  }
}

// =====================================================================
// Slot resolver
// =====================================================================

export function resolveSlot(slot: ContextSlot, ctx: DslContext): string {
  switch (slot.kind) {
    case 'physics': {
      let v: number | null = null;
      switch (slot.metric) {
        case 'aw': v = ctx.aw.aw; break;
        case 'pH': v = ctx.pH?.pH ?? null; break;
        case 'fatPct': v = ctx.aw.fatPct; break;
        case 'aqueousSugarPct': v = ctx.aw.aqueousSugarPct; break;
        case 'shelfLifeWeeks': v = ctx.shelfLifeWeeks; break;
      }
      return formatNumeric(v, slot.formatter);
    }

    case 'role_quantity': {
      const total = ctx.resolved
        .filter(r => r.role === slot.role)
        .reduce((s, r) => s + r.mass, 0);
      return formatNumeric(total, slot.formatter);
    }

    case 'role_property': {
      const matching = ctx.resolved.filter(r => r.role === slot.role);
      if (matching.length === 0) return '';
      // Simple join — for two cream-role ingredients ("heavy cream + crème fraîche"), give both.
      return matching.map(r => r.name).join(' + ');
    }

    case 'derived': {
      switch (slot.name) {
        case 'temperWindow':
          return ctx.confectionery?.derived.polymorph
            ? `${ctx.confectionery.derived.polymorph.tempWindowC[0]}–${ctx.confectionery.derived.polymorph.tempWindowC[1]}°C`
            : '';
        case 'temperWorkingPoint':
          return ctx.confectionery?.derived.polymorph
            ? formatNumeric(ctx.confectionery.derived.polymorph.workingPointC, 'temp_c')
            : '';
        case 'curdleFoldCeiling':
          return ctx.confectionery?.derived.curdle.recommendedFoldTempCeilingC
            ? formatNumeric(ctx.confectionery.derived.curdle.recommendedFoldTempCeilingC, 'temp_c')
            : '';
        case 'curdleRiskLabel':
          return ctx.confectionery?.derived.curdle.level ?? '';
        case 'finalAbv':
          return ctx.confectionery?.derived.ethanol.abv != null
            ? formatNumeric(ctx.confectionery.derived.ethanol.abv, 'percent_int')
            : '';
      }
    }
  }
}

function formatNumeric(v: number | null, formatter: SlotFormatter): string {
  if (v === null || isNaN(v)) return '';
  switch (formatter) {
    case 'percent_int':       return `${Math.round(v)}%`;
    case 'gram_int':          return `${Math.round(v)} g`;
    case 'gram_one_decimal':  return `${v.toFixed(1)} g`;
    case 'aw_three_decimals': return v.toFixed(3);
    case 'ph_two_decimals':   return v.toFixed(2);
    case 'temp_c':            return `${v.toFixed(1)}°C`;
    case 'identity':          return String(v);
  }
}

// =====================================================================
// Template renderer
// =====================================================================

/**
 * Renders a template string by replacing {{slotName}} markers with resolved
 * slot values. Slots that don't appear in the template are silently ignored;
 * markers with no matching slot key remain literal (uncommon but safe).
 */
export function renderStepTemplate(
  template: string,
  slots: Record<string, ContextSlot>,
  ctx: DslContext
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (full, key) => {
    const slot = slots[key];
    if (!slot) return full;
    return resolveSlot(slot, ctx);
  });
}
