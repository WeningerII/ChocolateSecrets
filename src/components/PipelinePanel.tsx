import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Recipe, Ingredient, Composition } from '../types';
import { resolveRecipeLeaves } from '../utils/resolveRecipeLeaves';
import { aggregateComposition } from '../services/foodScience/universal';
import {
  makeFoodState, runPipeline, type Operator,
  ferment, enzyme, reduce, heat, caramelize, aerate, chill, add,
  brine, dehydrate, freeze, emulsify, setGel, temper,
  type Culture, type Enzyme, type BrineSolute,
} from '../services/foodScience/operators';
import type { GellingAgent } from '../services/foodScience/structure';

/**
 * "Recipe as a program" — chain the unit operators (ferment → reduce → heat →
 * chill …) over the recipe's starting composition and watch the state evolve:
 * composition, mass, temperature and the markers each step records. This makes
 * the operator instruction set operable from the app, not just from tests.
 */
interface PipelinePanelProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  recipes: Recipe[];
}

// Simple, recognizable additions for the `add` operator (mass-% compositions).
const ADDITIONS: Record<string, Composition> = {
  water: { water: 100 },
  sugar: { sucrose: 100 },
  salt: { ash: 100, sodium: 39.34 },
  cream: { water: 58, fat: 38, protein: 2, lactose: 2 },
  butter: { fat: 81, water: 16, protein: 1, ash: 2 },
  egg: { water: 76, protein: 12, fat: 10, ash: 2 },
  flour: { starch: 73, protein: 11, water: 13, fat: 2, ash: 1 },
};

const CULTURES: Culture[] = ['ale_yeast', 'lager_yeast', 'wine_yeast', 'yogurt_lactic', 'sourdough'];
const ENZYMES: Enzyme[] = ['invertase', 'amylase', 'protease'];
const SOLUTES: BrineSolute[] = ['salt', 'sugar'];
const AGENTS: GellingAgent[] = ['gelatin', 'agar', 'pectin_hm', 'pectin_lm', 'kappa_carrageenan', 'iota_carrageenan', 'starch', 'methylcellulose', 'sodium_alginate'];

type Field =
  | { key: string; type: 'num'; def: number; step?: number; min?: number; max?: number }
  | { key: string; type: 'sel'; def: string; options: string[] };

interface OpDef {
  id: string;
  fields: Field[];
  make: (p: Record<string, string | number>) => Operator;
}

const num = (p: Record<string, string | number>, k: string) => Number(p[k]);
const str = (p: Record<string, string | number>, k: string) => String(p[k]);
const sizeM = (cm: number) => Math.max(1e-4, cm / 100);

// The operator registry: friendly fields (minutes, hours, cm, %) → operator units.
export const OPERATORS: OpDef[] = [
  { id: 'add', fields: [{ key: 'addition', type: 'sel', def: 'sugar', options: Object.keys(ADDITIONS) }, { key: 'massG', type: 'num', def: 100, step: 10, min: 0 }, { key: 'tempC', type: 'num', def: 20 }],
    make: p => add({ composition: ADDITIONS[str(p, 'addition')], massG: num(p, 'massG'), tempC: num(p, 'tempC'), label: str(p, 'addition') }) },
  { id: 'ferment', fields: [{ key: 'culture', type: 'sel', def: 'ale_yeast', options: CULTURES }, { key: 'durationHr', type: 'num', def: 48, step: 1, min: 0 }, { key: 'tempC', type: 'num', def: 20 }],
    make: p => ferment({ culture: str(p, 'culture') as Culture, durationS: num(p, 'durationHr') * 3600, tempC: num(p, 'tempC') }) },
  { id: 'enzyme', fields: [{ key: 'enzyme', type: 'sel', def: 'amylase', options: ENZYMES }, { key: 'durationMin', type: 'num', def: 60, step: 5, min: 0 }, { key: 'tempC', type: 'num', def: 50 }],
    make: p => enzyme({ enzyme: str(p, 'enzyme') as Enzyme, durationS: num(p, 'durationMin') * 60, tempC: num(p, 'tempC') }) },
  { id: 'reduce', fields: [{ key: 'removeWaterPct', type: 'num', def: 30, step: 5, min: 0, max: 100 }, { key: 'tempC', type: 'num', def: 100 }],
    make: p => reduce({ removeWaterFraction: num(p, 'removeWaterPct') / 100, tempC: num(p, 'tempC') }) },
  { id: 'heat', fields: [{ key: 'tempC', type: 'num', def: 100 }, { key: 'durationMin', type: 'num', def: 20, step: 1, min: 0 }],
    make: p => heat({ tempC: num(p, 'tempC'), durationS: num(p, 'durationMin') * 60 }) },
  { id: 'caramelize', fields: [{ key: 'tempC', type: 'num', def: 180 }, { key: 'durationMin', type: 'num', def: 10, step: 1, min: 0 }],
    make: p => caramelize({ tempC: num(p, 'tempC'), durationS: num(p, 'durationMin') * 60 }) },
  { id: 'aerate', fields: [{ key: 'targetOverrunPct', type: 'num', def: 100, step: 10, min: 0 }],
    make: p => aerate({ targetOverrunPct: num(p, 'targetOverrunPct') }) },
  { id: 'emulsify', fields: [{ key: 'emulsifierHLB', type: 'num', def: 10, step: 1, min: 0, max: 20 }],
    make: p => emulsify({ emulsifierHLB: num(p, 'emulsifierHLB') }) },
  { id: 'setGel', fields: [{ key: 'agent', type: 'sel', def: 'gelatin', options: AGENTS }, { key: 'concentrationPct', type: 'num', def: 1, step: 0.1, min: 0 }, { key: 'cofactor', type: 'sel', def: 'none', options: ['none', 'calcium', 'potassium'] }],
    make: p => setGel({ agent: str(p, 'agent') as GellingAgent, concentrationPct: num(p, 'concentrationPct'), hasCalcium: str(p, 'cofactor') === 'calcium', hasPotassium: str(p, 'cofactor') === 'potassium' }) },
  { id: 'chill', fields: [{ key: 'tempC', type: 'num', def: 4 }],
    make: p => chill({ tempC: num(p, 'tempC') }) },
  { id: 'brine', fields: [{ key: 'solute', type: 'sel', def: 'salt', options: SOLUTES }, { key: 'bathConcentrationPct', type: 'num', def: 10, step: 1, min: 0, max: 99 }, { key: 'durationHr', type: 'num', def: 24, step: 1, min: 0 }, { key: 'sizeCm', type: 'num', def: 2, step: 0.5, min: 0.1 }],
    make: p => brine({ solute: str(p, 'solute') as BrineSolute, bathConcentrationPct: num(p, 'bathConcentrationPct'), durationS: num(p, 'durationHr') * 3600, geometry: 'slab', characteristicLengthM: sizeM(num(p, 'sizeCm')) }) },
  { id: 'dehydrate', fields: [{ key: 'airTempC', type: 'num', def: 60 }, { key: 'rhPct', type: 'num', def: 30, step: 5, min: 0, max: 100 }, { key: 'durationHr', type: 'num', def: 6, step: 1, min: 0 }],
    make: p => dehydrate({ airTempC: num(p, 'airTempC'), relativeHumidity: num(p, 'rhPct') / 100, surfaceCoeffWm2K: 25, surfaceAreaM2: 0.05, durationS: num(p, 'durationHr') * 3600 }) },
  { id: 'freeze', fields: [{ key: 'mode', type: 'sel', def: 'freeze', options: ['freeze', 'thaw'] }, { key: 'mediumTempC', type: 'num', def: -25 }, { key: 'targetTempC', type: 'num', def: -18 }, { key: 'sizeCm', type: 'num', def: 4, step: 0.5, min: 0.1 }],
    make: p => freeze({ geometry: 'sphere', characteristicDimensionM: sizeM(num(p, 'sizeCm')), mediumTempC: num(p, 'mediumTempC'), surfaceCoeffWm2K: 20, mode: str(p, 'mode') as 'freeze' | 'thaw', targetTempC: num(p, 'targetTempC') }) },
  { id: 'temper', fields: [{ key: 'cocoaPercentage', type: 'num', def: 70, step: 5, min: 0, max: 100 }, { key: 'tempC', type: 'num', def: 31.5, step: 0.5 }],
    make: p => temper({ cocoaPercentage: num(p, 'cocoaPercentage'), tempC: num(p, 'tempC') }) },
];

const OP_BY_ID = Object.fromEntries(OPERATORS.map(o => [o.id, o]));
export const defaultParams = (op: OpDef): Record<string, string | number> =>
  Object.fromEntries(op.fields.map(f => [f.key, f.def]));

interface Step { uid: number; opId: string; params: Record<string, string | number> }

const fmt = (v: number): string => {
  if (!isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && a < 0.01) return v.toExponential(1);
  if (a >= 100) return v.toFixed(0);
  if (a >= 1) return v.toFixed(1);
  return v.toFixed(2);
};

export function PipelinePanel({ recipe, ingredients, recipes }: PipelinePanelProps) {
  const { t } = useTranslation('chemistry');
  const uid = useRef(1);
  const [startMassG, setStartMass] = useState(1000);
  const [startTempC, setStartTemp] = useState(20);
  const [steps, setSteps] = useState<Step[]>([]);

  const startComposition = useMemo(() => {
    const { resolved } = resolveRecipeLeaves(recipe, ingredients, recipes, 1);
    return aggregateComposition(resolved);
  }, [recipe, ingredients, recipes]);

  const result = useMemo(() => {
    const ops = steps.map(s => OP_BY_ID[s.opId].make(s.params));
    return runPipeline(makeFoodState(startComposition, startMassG, startTempC), ops);
  }, [startComposition, startMassG, startTempC, steps]);

  const addStep = () => {
    const op = OPERATORS[0];
    setSteps(s => [...s, { uid: uid.current++, opId: op.id, params: defaultParams(op) }]);
  };
  const removeStep = (u: number) => setSteps(s => s.filter(x => x.uid !== u));
  const move = (u: number, dir: -1 | 1) => setSteps(s => {
    const i = s.findIndex(x => x.uid === u);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= s.length) return s;
    const next = [...s];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const setOp = (u: number, opId: string) => setSteps(s => s.map(x =>
    x.uid === u ? { ...x, opId, params: defaultParams(OP_BY_ID[opId]) } : x));
  const setParam = (u: number, key: string, val: string | number) => setSteps(s => s.map(x =>
    x.uid === u ? { ...x, params: { ...x.params, [key]: val } } : x));

  const sel = 'px-2 py-1 border border-cream-300 rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-cocoa-500';
  const finalState = result.final;
  const topSpecies = (Object.entries(finalState.composition) as [string, number][])
    .filter(([, v]) => v >= 0.05).sort((a, b) => b[1] - a[1]);
  const markers = Object.entries(finalState.markers).filter(([, v]) => isFinite(v));

  return (
    <div className="rounded-md bg-cream-50 px-5 py-5 mt-2 border border-cream-200 text-sm text-cocoa-700">
      <h4 className="font-serif text-[12px] uppercase tracking-wider text-cocoa-500 font-medium">{t('chemistry:pipeline.title')}</h4>
      <p className="text-[11px] text-cocoa-500 mt-1 mb-3">{t('chemistry:pipeline.intro')}</p>

      {/* Starting state */}
      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        <div className="sm:col-span-1">
          <span className="text-cocoa-600">{t('chemistry:pipeline.startMass')}</span>
          <input type="number" className={`${sel} font-mono w-full mt-1`} value={startMassG} min={1} step={50}
            onChange={e => setStartMass(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="sm:col-span-1">
          <span className="text-cocoa-600">{t('chemistry:pipeline.startTemp')}</span>
          <input type="number" className={`${sel} font-mono w-full mt-1`} value={startTempC} step={1}
            onChange={e => setStartTemp(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="sm:col-span-1 flex items-end">
          <span className="text-[11px] text-cocoa-400">{t('chemistry:pipeline.startFromRecipe')}</span>
        </div>
      </div>

      {/* Steps */}
      <div className="mt-4 flex flex-col gap-2">
        {steps.length === 0 && <p className="text-[11px] text-cocoa-400 italic">{t('chemistry:pipeline.noSteps')}</p>}
        {steps.map((s, i) => {
          const op = OP_BY_ID[s.opId];
          const log = result.logs[i];
          const after = result.trajectory[i + 1];
          return (
            <div key={s.uid} className="rounded border border-cream-300 bg-white px-3 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-cocoa-400 font-mono w-4">{i + 1}</span>
                <select className={sel} value={s.opId} onChange={e => setOp(s.uid, e.target.value)}>
                  {OPERATORS.map(o => <option key={o.id} value={o.id}>{t(`chemistry:pipeline.op.${o.id}` as any)}</option>)}
                </select>
                {op.fields.map(f => (
                  <label key={f.key} className="flex items-center gap-1 text-[11px] text-cocoa-600">
                    <span>{t(`chemistry:pipeline.param.${f.key}` as any)}</span>
                    {f.type === 'sel' ? (
                      <select className={sel} value={String(s.params[f.key])} onChange={e => setParam(s.uid, f.key, e.target.value)}>
                        {f.options.map(o => <option key={o} value={o}>{t(`chemistry:pipeline.opt.${o}` as any, { defaultValue: o })}</option>)}
                      </select>
                    ) : (
                      <input type="number" className={`${sel} font-mono w-20`} value={s.params[f.key]} step={f.step ?? 1} min={f.min} max={f.max}
                        onChange={e => setParam(s.uid, f.key, parseFloat(e.target.value) || 0)} />
                    )}
                  </label>
                ))}
                <div className="ml-auto flex gap-1">
                  <button type="button" onClick={() => move(s.uid, -1)} disabled={i === 0}
                    className="px-1.5 py-0.5 text-cocoa-400 hover:text-cocoa-700 disabled:opacity-30" title={t('chemistry:pipeline.moveUp')}>↑</button>
                  <button type="button" onClick={() => move(s.uid, 1)} disabled={i === steps.length - 1}
                    className="px-1.5 py-0.5 text-cocoa-400 hover:text-cocoa-700 disabled:opacity-30" title={t('chemistry:pipeline.moveDown')}>↓</button>
                  <button type="button" onClick={() => removeStep(s.uid)}
                    className="px-1.5 py-0.5 text-raspberry/70 hover:text-raspberry" title={t('chemistry:pipeline.removeStep')}>✕</button>
                </div>
              </div>
              {/* What this step did */}
              <div className="flex flex-wrap gap-1 mt-2 items-center">
                {Object.entries(log.detail).map(([k, v]) => (
                  <span key={k} className="text-[10px] bg-cream-100 rounded px-1.5 py-0.5 text-cocoa-600">
                    {k} <span className="font-mono text-cocoa-900">{typeof v === 'number' ? fmt(v) : v}</span>
                  </span>
                ))}
                <span className="text-[10px] text-cocoa-400 ml-1 font-mono">→ {fmt(after.massG)}g · {fmt(after.tempC)}°C</span>
              </div>
            </div>
          );
        })}
        <button type="button" onClick={addStep}
          className="self-start mt-1 px-3 py-1 rounded border border-cocoa-300 text-cocoa-700 text-xs hover:bg-cocoa-50">
          + {t('chemistry:pipeline.addStep')}
        </button>
      </div>

      {/* Final state */}
      {steps.length > 0 && (
        <div className="mt-5 border-t border-cream-200 pt-3">
          <div className="flex items-baseline gap-3">
            <span className="text-[12px] uppercase tracking-wider text-cocoa-500">{t('chemistry:pipeline.finalState')}</span>
            <span className="font-mono text-cocoa-900 text-sm">{fmt(finalState.massG)} g · {fmt(finalState.tempC)} °C</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-2">
            <div>
              <div className="text-[10px] text-cocoa-500 mb-1">{t('chemistry:pipeline.composition')}</div>
              <div className="flex flex-wrap gap-1">
                {topSpecies.map(([k, v]) => (
                  <span key={k} className="text-[10px] bg-white border border-cream-200 rounded px-1.5 py-0.5">
                    {k} <span className="font-mono text-cocoa-900">{v.toFixed(1)}%</span>
                  </span>
                ))}
              </div>
            </div>
            {markers.length > 0 && (
              <div>
                <div className="text-[10px] text-cocoa-500 mb-1">{t('chemistry:pipeline.markers')}</div>
                <div className="flex flex-wrap gap-1">
                  {markers.map(([k, v]) => (
                    <span key={k} className="text-[10px] bg-white border border-cream-200 rounded px-1.5 py-0.5">
                      {k} <span className="font-mono text-cocoa-900">{fmt(v)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-cocoa-500 mt-3 leading-relaxed">{t('chemistry:pipeline.caveat')}</p>
    </div>
  );
}
