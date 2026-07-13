import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Recipe, Ingredient } from '../types';
import { resolveRecipeLeaves } from '../utils/resolveRecipeLeaves';
import { aggregateComposition } from '../services/foodScience/universal';
import {
  computeHeatPenetration, computeMassPenetration, computeThermalProperties,
  computePlankTime, computeSurfaceCoefficient, computeDryingRate,
  type Geometry, type CookingMethod, type Diffusant, type Medium, type ConvectionRegime,
} from '../services/foodScience/transport';

/** Freezing/thawing environments → surface spec for the Plank h. */
const FREEZE_ENV: Record<string, { medium: Medium; regime: ConvectionRegime; velocityMS?: number }> = {
  still_freezer: { medium: 'air', regime: 'natural' },
  blast_freezer: { medium: 'air', regime: 'forced', velocityMS: 6 },
  ice_bath: { medium: 'water', regime: 'forced', velocityMS: 0.3 },
};
const FREEZE_ENVS = Object.keys(FREEZE_ENV);

/** Methods whose h is derived first-principles (single-phase convection + radiation).
 *  Phase-change methods (poach/boil/steam) keep their preset h. */
const SURFACE_BY_METHOD: Partial<Record<CookingMethod, { medium: Medium; regime: ConvectionRegime; velocityMS?: number }>> = {
  still_air_oven: { medium: 'air', regime: 'natural' },
  fan_oven: { medium: 'air', regime: 'forced', velocityMS: 3 },
  sous_vide: { medium: 'water', regime: 'forced', velocityMS: 0.1 },
  deep_frying: { medium: 'oil', regime: 'natural' },
};

interface TransportPanelProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  recipes: Recipe[];
}

const GEOMETRIES: Geometry[] = ['slab', 'cylinder', 'sphere'];
const METHODS: CookingMethod[] = ['still_air_oven', 'fan_oven', 'sous_vide', 'poaching_boiling', 'steaming', 'deep_frying'];
const DIFFUSANTS: Diffusant[] = ['salt_in_meat', 'salt_in_vegetable', 'sugar_osmotic', 'water_drying', 'fat_bloom'];

/**
 * "Cooking & transport" — drive the transient heat/mass solver from the recipe's
 * composition. Pick a shape, size and method; see thermal properties, the core
 * temperature over time / time-to-doneness, or brine/cure penetration time.
 */
export function TransportPanel({ recipe, ingredients, recipes }: TransportPanelProps) {
  const { t } = useTranslation(['chemistry']);
  const [geometry, setGeometry] = useState<Geometry>('sphere');
  const [sizeCm, setSizeCm] = useState(2.5);
  const [mode, setMode] = useState<'cook' | 'brine' | 'freeze' | 'dry'>('cook');
  const [method, setMethod] = useState<CookingMethod>('fan_oven');
  const [initialTempC, setInitial] = useState(5);
  const [mediumTempC, setMedium] = useState(180);
  const [targetCoreTempC, setTarget] = useState(70);
  const [diffusant, setDiffusant] = useState<Diffusant>('salt_in_meat');
  const [saturation, setSaturation] = useState(50);
  const [freezeEnv, setFreezeEnv] = useState('blast_freezer');
  const [freezeDir, setFreezeDir] = useState<'freeze' | 'thaw'>('freeze');
  const [freezeMediumTempC, setFreezeMedium] = useState(-25);
  const [dryAirTempC, setDryAirTemp] = useState(60);
  const [dryRH, setDryRH] = useState(30);
  const [dryAirflow, setDryAirflow] = useState<'still' | 'moving'>('moving');

  const composition = useMemo(() => {
    const { resolved } = resolveRecipeLeaves(recipe, ingredients, recipes, 1);
    return aggregateComposition(resolved);
  }, [recipe, ingredients, recipes]);

  const L = Math.max(1e-4, sizeCm / 100); // cm → m
  const thermal = useMemo(() => computeThermalProperties(composition, 20), [composition]);

  // h source: first-principles surface spec for single-phase methods, preset h otherwise.
  const hSource = SURFACE_BY_METHOD[method] ? { surface: SURFACE_BY_METHOD[method] } : { method };

  const cook = useMemo(() => {
    if (mode !== 'cook') return null;
    return computeHeatPenetration({
      geometry, characteristicLengthM: L, composition,
      initialTempC, mediumTempC, targetCoreTempC, ...hSource,
    });
  }, [mode, geometry, L, composition, initialTempC, mediumTempC, method, targetCoreTempC]);

  // Core-temperature curve over time (only when a finite cook time exists).
  const cookCurve = useMemo(() => {
    if (!cook || cook.timeToCoreTargetS == null || !isFinite(cook.timeToCoreTargetS)) return null;
    const horizon = cook.timeToCoreTargetS * 1.5;
    const pts: { t: number; core: number; surf: number }[] = [];
    const N = 36;
    for (let i = 0; i <= N; i++) {
      const tt = (horizon * i) / N;
      const r = computeHeatPenetration({
        geometry, characteristicLengthM: L, composition,
        initialTempC, mediumTempC, timeS: tt, ...hSource,
      });
      if (r?.atTime) pts.push({ t: tt, core: r.atTime.coreTempC, surf: r.atTime.surfaceTempC });
    }
    return { horizon, pts };
  }, [cook, geometry, L, composition, initialTempC, mediumTempC, method]);

  const brine = useMemo(() => {
    if (mode !== 'brine') return null;
    return computeMassPenetration({
      geometry, characteristicLengthM: L, diffusant, targetCenterSaturation: saturation / 100,
    });
  }, [mode, geometry, L, diffusant, saturation]);

  const phase = useMemo(() => {
    if (mode !== 'freeze') return null;
    const env = FREEZE_ENV[freezeEnv];
    const a = 2 * L; // Plank uses the full thickness/diameter
    const surf = computeSurfaceCoefficient({
      medium: env.medium, regime: env.regime, geometry, characteristicLengthM: a,
      surfaceTempC: 0, mediumTempC: freezeMediumTempC, velocityMS: env.velocityMS, // surface sits ≈0°C at the front
    });
    const plank = computePlankTime({
      geometry, characteristicDimensionM: a, composition,
      mediumTempC: freezeMediumTempC, surfaceCoeffWm2K: surf.h, mode: freezeDir,
    });
    return { plank, h: surf.h };
  }, [mode, freezeEnv, freezeDir, freezeMediumTempC, geometry, L, composition]);

  const dry = useMemo(() => {
    if (mode !== 'dry') return null;
    const h = dryAirflow === 'moving' ? 35 : 12; // moving vs still air
    return computeDryingRate({ airTempC: dryAirTempC, relativeHumidity: dryRH / 100, surfaceCoeffWm2K: h });
  }, [mode, dryAirTempC, dryRH, dryAirflow]);

  const fmtTime = (s: number | null | undefined): string => {
    if (s == null || !isFinite(s)) return '—';
    if (s < 90) return `${Math.round(s)} ${t('chemistry:transport.sec')}`;
    if (s < 5400) return `${Math.round(s / 60)} ${t('chemistry:transport.min')}`;
    if (s < 172800) return `${(s / 3600).toFixed(1)} ${t('chemistry:transport.hr')}`;
    return `${(s / 86400).toFixed(1)} ${t('chemistry:transport.day')}`;
  };

  const sel = 'px-2 py-1 border border-cream-300 rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-cocoa-500';

  return (
    <div className="rounded-md bg-cream-50 px-5 py-5 mt-2 border border-cream-200 text-sm text-cocoa-700">
      <h4 className="font-serif text-[12px] uppercase tracking-wider text-cocoa-500 font-medium">{t('chemistry:transport.title')}</h4>
      <p className="text-[11px] text-cocoa-500 mt-1 mb-3">{t('chemistry:transport.intro')}</p>

      {/* Thermal properties (composition-only) */}
      {thermal && (
        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <Stat label={t('chemistry:transport.k')} value={thermal.k.toFixed(3)} unit="W/m·K" />
          <Stat label={t('chemistry:transport.cp')} value={(thermal.cp / 1000).toFixed(2)} unit="kJ/kg·K" />
          <Stat label={t('chemistry:transport.alpha')} value={(thermal.alpha * 1e7).toFixed(2)} unit="×10⁻⁷ m²/s" />
        </div>
      )}

      {/* Geometry + size + mode */}
      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-cocoa-600">{t('chemistry:transport.geometry')}</span>
          <select className={sel} value={geometry} onChange={e => setGeometry(e.target.value as Geometry)}>
            {GEOMETRIES.map(g => <option key={g} value={g}>{t(`chemistry:transport.geom.${g}` as any)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-cocoa-600">{geometry === 'slab' ? t('chemistry:transport.halfThickness') : t('chemistry:transport.radius')}</span>
          <input type="number" className={`${sel} font-mono`} value={sizeCm} min={0.1} max={20} step={0.1}
            onChange={e => setSizeCm(parseFloat(e.target.value) || 0)} />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-cocoa-600">{t('chemistry:transport.mode')}</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => setMode('cook')}
              className={`flex-1 px-2 py-1 rounded border ${mode === 'cook' ? 'bg-cocoa-600 text-white border-cocoa-600' : 'bg-white border-cream-300'}`}>{t('chemistry:transport.cook')}</button>
            <button type="button" onClick={() => setMode('brine')}
              className={`flex-1 px-2 py-1 rounded border ${mode === 'brine' ? 'bg-cocoa-600 text-white border-cocoa-600' : 'bg-white border-cream-300'}`}>{t('chemistry:transport.brine')}</button>
            <button type="button" onClick={() => setMode('freeze')}
              className={`flex-1 px-2 py-1 rounded border ${mode === 'freeze' ? 'bg-cocoa-600 text-white border-cocoa-600' : 'bg-white border-cream-300'}`}>{t('chemistry:transport.freeze')}</button>
            <button type="button" onClick={() => setMode('dry')}
              className={`flex-1 px-2 py-1 rounded border ${mode === 'dry' ? 'bg-cocoa-600 text-white border-cocoa-600' : 'bg-white border-cream-300'}`}>{t('chemistry:transport.dry')}</button>
          </div>
        </div>
      </div>

      {mode === 'cook' && (
        <>
          <div className="grid sm:grid-cols-4 gap-3 text-xs mt-3">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-cocoa-600">{t('chemistry:transport.method')}</span>
              <select className={sel} value={method} onChange={e => setMethod(e.target.value as CookingMethod)}>
                {METHODS.map(m => <option key={m} value={m}>{t(`chemistry:transport.methodOpt.${m}` as any)}</option>)}
              </select>
            </label>
            <NumField label={t('chemistry:transport.initialTemp')} value={initialTempC} onChange={setInitial} />
            <NumField label={t('chemistry:transport.mediumTemp')} value={mediumTempC} onChange={setMedium} />
          </div>
          <div className="grid sm:grid-cols-4 gap-3 text-xs mt-3">
            <NumField label={t('chemistry:transport.targetCore')} value={targetCoreTempC} onChange={setTarget} />
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-cocoa-500 text-xs">{t('chemistry:transport.timeToCore')}</span>
              <span className="font-serif text-xl text-cocoa-900">{fmtTime(cook?.timeToCoreTargetS)}</span>
              {cook && <span className="text-[11px] text-cocoa-400">Bi {cook.Bi.toFixed(2)}</span>}
            </div>
            {cook?.surfaceCoefficient && (
              <p className="text-[11px] text-cocoa-500 mt-1">
                {t('chemistry:transport.hBreakdown', {
                  h: cook.h.toFixed(0),
                  conv: cook.surfaceCoefficient.hConv.toFixed(0),
                  rad: cook.surfaceCoefficient.hRad.toFixed(0),
                })}
              </p>
            )}

            {cookCurve && (
              <div className="mt-3">
                <div className="flex items-end gap-px h-16">
                  {cookCurve.pts.map((p, i) => {
                    const frac = (p.core - initialTempC) / (mediumTempC - initialTempC || 1);
                    const done = p.core >= targetCoreTempC;
                    return <div key={i} className={`flex-1 rounded-t ${done ? 'bg-cocoa-600' : 'bg-cocoa-300'}`}
                      style={{ height: `${Math.max(2, Math.min(100, frac * 100))}%` }}
                      title={`${fmtTime(p.t)} · core ${Math.round(p.core)}°C`} />;
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-cocoa-400 mt-1">
                  <span>0</span><span>{t('chemistry:transport.coreVsTime')}</span><span>{fmtTime(cookCurve.horizon)}</span>
                </div>
              </div>
            )}
            {cook?.flags.some(f => f.kind === 'target_unreachable') && (
              <p className="text-[11px] text-amber-600 mt-2">{t('chemistry:transport.unreachable')}</p>
            )}
          </div>
        </>
      )}

      {mode === 'brine' && (
        <>
          <div className="grid sm:grid-cols-2 gap-3 text-xs mt-3">
            <label className="flex flex-col gap-1">
              <span className="text-cocoa-600">{t('chemistry:transport.diffusant')}</span>
              <select className={sel} value={diffusant} onChange={e => setDiffusant(e.target.value as Diffusant)}>
                {DIFFUSANTS.map(d => <option key={d} value={d}>{t(`chemistry:transport.diffOpt.${d}` as any)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-cocoa-600">{t('chemistry:transport.targetSaturation', { value: saturation })}</span>
              <input type="range" min={5} max={95} step={5} value={saturation}
                onChange={e => setSaturation(parseInt(e.target.value, 10))} className="w-full" />
            </label>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-cocoa-500 text-xs">{t('chemistry:transport.timeToSaturation')}</span>
            <span className="font-serif text-xl text-cocoa-900">{fmtTime(brine?.timeToTargetS)}</span>
          </div>
          <p className="text-[11px] text-cocoa-500 mt-2">{t('chemistry:transport.brineNote')}</p>
        </>
      )}

      {mode === 'freeze' && (
        <>
          <div className="grid sm:grid-cols-3 gap-3 text-xs mt-3">
            <label className="flex flex-col gap-1">
              <span className="text-cocoa-600">{t('chemistry:transport.environment')}</span>
              <select className={sel} value={freezeEnv} onChange={e => setFreezeEnv(e.target.value)}>
                {FREEZE_ENVS.map(en => <option key={en} value={en}>{t(`chemistry:transport.envOpt.${en}` as any)}</option>)}
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-cocoa-600">{t('chemistry:transport.direction')}</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => { setFreezeDir('freeze'); setFreezeMedium(-25); }}
                  className={`flex-1 px-2 py-1 rounded border ${freezeDir === 'freeze' ? 'bg-cocoa-600 text-white border-cocoa-600' : 'bg-white border-cream-300'}`}>{t('chemistry:transport.dirFreeze')}</button>
                <button type="button" onClick={() => { setFreezeDir('thaw'); setFreezeMedium(5); }}
                  className={`flex-1 px-2 py-1 rounded border ${freezeDir === 'thaw' ? 'bg-cocoa-600 text-white border-cocoa-600' : 'bg-white border-cream-300'}`}>{t('chemistry:transport.dirThaw')}</button>
              </div>
            </div>
            <NumField label={t('chemistry:transport.mediumTemp')} value={freezeMediumTempC} onChange={setFreezeMedium} />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-cocoa-500 text-xs">{freezeDir === 'freeze' ? t('chemistry:transport.timeToFreeze') : t('chemistry:transport.timeToThaw')}</span>
            <span className="font-serif text-xl text-cocoa-900">{fmtTime(phase?.plank?.timeS)}</span>
            {phase?.plank && phase.plank.timeS != null && (
              <span className="text-[11px] text-cocoa-400">Tf {phase.plank.freezingPointC.toFixed(1)}°C · h {phase.h.toFixed(0)}</span>
            )}
          </div>
          {phase?.plank?.flags.some(f => f.kind === 'medium_not_freezing' || f.kind === 'medium_not_thawing') && (
            <p className="text-[11px] text-amber-600 mt-2">{t('chemistry:transport.phaseImpossible')}</p>
          )}
          <p className="text-[11px] text-cocoa-500 mt-2">{t('chemistry:transport.freezeNote')}</p>
        </>
      )}

      {mode === 'dry' && (
        <>
          <div className="grid sm:grid-cols-3 gap-3 text-xs mt-3">
            <NumField label={t('chemistry:transport.airTemp')} value={dryAirTempC} onChange={setDryAirTemp} />
            <label className="flex flex-col gap-1">
              <span className="text-cocoa-600">{t('chemistry:transport.humidity', { value: dryRH })}</span>
              <input type="range" min={5} max={95} step={5} value={dryRH}
                onChange={e => setDryRH(parseInt(e.target.value, 10))} className="w-full" />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-cocoa-600">{t('chemistry:transport.airflow')}</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => setDryAirflow('still')}
                  className={`flex-1 px-2 py-1 rounded border ${dryAirflow === 'still' ? 'bg-cocoa-600 text-white border-cocoa-600' : 'bg-white border-cream-300'}`}>{t('chemistry:transport.airflowStill')}</button>
                <button type="button" onClick={() => setDryAirflow('moving')}
                  className={`flex-1 px-2 py-1 rounded border ${dryAirflow === 'moving' ? 'bg-cocoa-600 text-white border-cocoa-600' : 'bg-white border-cream-300'}`}>{t('chemistry:transport.airflowMoving')}</button>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <Stat label={t('chemistry:transport.surfaceTemp')} value={dry ? dry.surfaceTempC.toFixed(1) : '—'} unit="°C" />
            <Stat label={t('chemistry:transport.dryingRate')} value={dry ? dry.fluxKgM2h.toFixed(2) : '—'} unit="kg/m²·h" />
          </div>
          <p className="text-[11px] text-cocoa-500 mt-2">
            {t('chemistry:transport.dryNote', { cooling: dry ? dry.evaporativeCoolingC.toFixed(0) : '0' })}
          </p>
        </>
      )}

      <p className="text-[11px] text-cocoa-500 mt-3 leading-relaxed">{t('chemistry:transport.caveat')}</p>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-white rounded border border-cream-200 px-2 py-1.5">
      <div className="text-[10px] text-cocoa-500">{label}</div>
      <div className="font-mono text-cocoa-900">{value}<span className="text-[10px] text-cocoa-400 ml-1">{unit}</span></div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-cocoa-600">{label}</span>
      <input type="number" value={value} step={1}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="px-2 py-1 border border-cream-300 rounded bg-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cocoa-500" />
    </label>
  );
}
