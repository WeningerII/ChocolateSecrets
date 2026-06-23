import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { RecipePhysics } from '../hooks/useRecipePhysics';
import type { CompositionSource, Recipe } from '../types';

interface RecipePhysicsDetailProps {
  physics: RecipePhysics;
  recipe: Recipe;
}

const AW_BANDS_FOR_TABLE = [
  { key: 'very-fragile' as const, range: '> 0.92' },
  { key: 'fragile' as const, range: '0.85 – 0.92' },
  { key: 'stabilized' as const, range: '0.78 – 0.85' },
  { key: 'shelf-stable' as const, range: '0.70 – 0.78' },
  { key: 'functionally-stable' as const, range: '< 0.70' },
];

export function RecipePhysicsDetail({ physics, recipe }: RecipePhysicsDetailProps) {
  const { t } = useTranslation(['chemistry', 'recipes']);
  const aw = physics.aw;
  const ph = physics.pH;

  const sourceCounts = useMemo(() => {
    const counts: Partial<Record<CompositionSource, number>> = {};
    for (const ing of physics.resolvedIngredients) {
      counts[ing.compositionSource] = (counts[ing.compositionSource] ?? 0) + 1;
    }
    return counts;
  }, [physics.resolvedIngredients]);

  const totalDepression = aw.terms.reduce((acc, t) => acc + t.contribution, 0);
  const norrishWalkthrough = aw.aw === null ? null : (
    <pre className="font-mono text-xs leading-7 whitespace-pre-wrap text-cocoa-700 my-2">
{`ln(Aw) = ln(Xw) − Σᵢ Kᵢ · Xᵢ²
       = ln(${aw.Xw.toFixed(4)}) − [${aw.terms.map(t => `${t.K.toFixed(2)} × ${t.X.toFixed(4)}²`).join(' + ') || '0'}]
       = ${aw.lnXw.toFixed(4)} − ${totalDepression.toFixed(5)}
       = ${(aw.lnXw - totalDepression).toFixed(4)}

Aw = e^(${(aw.lnXw - totalDepression).toFixed(4)}) = ${aw.aw.toFixed(4)}`}
    </pre>
  );

  const phInterpretationKey =
    ph === null ? null
    : ph.pH < 4.0 ? 'chemistry:detail.ph.interpretation.veryLow'
    : ph.pH < 4.6 ? 'chemistry:detail.ph.interpretation.low'
    : ph.pH < 5.5 ? 'chemistry:detail.ph.interpretation.moderate'
    : 'chemistry:detail.ph.interpretation.high';

  return (
    <div className="rounded-md bg-cream-50 px-5 py-5 mt-2 border border-cream-200 text-sm leading-relaxed text-cocoa-700">
      {/* Composition table */}
      <SectionHeader>{t('chemistry:detail.compositionTable.title')}</SectionHeader>
      <table className="w-full text-xs font-mono mt-2">
        <thead>
          <tr className="text-cocoa-500">
            <th className="text-left font-medium pb-1">{t('chemistry:detail.compositionTable.species')}</th>
            <th className="text-right font-medium pb-1">{t('chemistry:detail.compositionTable.mass')}</th>
            <th className="text-right font-medium pb-1">{t('chemistry:detail.compositionTable.moles')}</th>
            <th className="text-right font-medium pb-1">{t('chemistry:detail.compositionTable.moleFraction')}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(aw.massBy)
            .filter(([, mass]) => mass > 0.01)
            .map(([species, mass]) => {
              const moles = aw.moles[species] ?? 0;
              const totalMoles = Object.values(aw.moles).reduce((a, b) => a + b, 0);
              const X = totalMoles > 0 ? moles / totalMoles : 0;
              return (
                <tr key={species}>
                  <td className="py-0.5">{species}</td>
                  <td className="py-0.5 text-right">{mass.toFixed(2)}</td>
                  <td className="py-0.5 text-right">{moles.toFixed(4)}</td>
                  <td className="py-0.5 text-right">{X.toFixed(4)}</td>
                </tr>
              );
            })}
        </tbody>
      </table>

      {/* Norrish walkthrough */}
      <SectionHeader className="mt-5">{t('chemistry:detail.norrish.title')}</SectionHeader>
      {norrishWalkthrough}
      {aw.flags.find(f => f.kind === 'lactose_upper_bound') && (
        <p className="text-[11px] italic text-cocoa-500 mt-2">† {t('chemistry:detail.norrish.footnoteLactose')}</p>
      )}
      {aw.flags.find(f => f.kind === 'ethanol_volatility_applied') && (
        <p className="text-[11px] italic text-cocoa-500 mt-1">
          † {t('chemistry:detail.norrish.footnoteEthanol' as any, { lossPct: 10 })}
        </p>
      )}

      {recipe.dietary && recipe.dietary.length > 0 && (
        <div className="mt-4 pt-4 border-t border-cocoa-100">
          <div className="text-sm font-medium text-cocoa-700 mb-1">
            {t('recipes:physics.dietary_label')}
          </div>
          <div className="flex gap-2 flex-wrap">
            {recipe.dietary.map(flag => (
              <span key={flag} className="px-2 py-0.5 rounded text-xs bg-cocoa-50 text-cocoa-700">
                {t(`recipes:physics.dietary.${flag}`)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* pH section */}
      {ph && (
        <>
          <SectionHeader className="mt-5">{t('chemistry:detail.ph.title')}</SectionHeader>
          <table className="w-full text-xs font-mono mt-2">
            <thead>
              <tr className="text-cocoa-500">
                <th className="text-left font-medium pb-1">{t('chemistry:detail.ph.table.component')}</th>
                <th className="text-right font-medium pb-1">{t('chemistry:detail.ph.table.waterMass')}</th>
                <th className="text-right font-medium pb-1">{t('chemistry:detail.ph.table.fraction')}</th>
              </tr>
            </thead>
            <tbody>
              {ph.components.map((c, idx) => (
                <tr key={c.bufferRef + idx}>
                  <td className="py-0.5">{c.bufferRef}</td>
                  <td className="py-0.5 text-right">{c.waterMass.toFixed(1)}</td>
                  <td className="py-0.5 text-right">{(c.fraction * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs mt-3 leading-relaxed">
            {t('chemistry:detail.ph.explanation' as any, { pH: ph.pH.toFixed(2) })}
          </p>
          {phInterpretationKey && (
            <p className="text-xs mt-1 italic text-cocoa-600">{t(phInterpretationKey as any)}</p>
          )}
        </>
      )}

      {/* Taste profile (perception layer) */}
      {(physics.taste.sweet + physics.taste.salty + physics.taste.sour) > 0.5 && (
        <>
          <SectionHeader className="mt-5">{t('chemistry:detail.taste.title')}</SectionHeader>
          <div className="mt-2 space-y-1.5">
            {(['sweet', 'salty', 'sour'] as const).map(q => (
              <div key={q} className="grid grid-cols-[64px_1fr_32px] items-center gap-2 text-xs">
                <span className="text-cocoa-500">{t(`chemistry:detail.taste.quality.${q}` as any)}</span>
                <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
                  <div className="h-full bg-cocoa-400 rounded-full" style={{ width: `${Math.min(100, physics.taste[q])}%` }} />
                </div>
                <span className="font-mono text-right text-cocoa-600">{Math.round(physics.taste[q])}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-cocoa-500 mt-2 leading-relaxed">{t('chemistry:detail.taste.caveat')}</p>
        </>
      )}

      {/* Maillard browning (time·temperature process layer) */}
      {physics.browning && (
        <>
          <SectionHeader className="mt-5">{t('chemistry:detail.browning.title')}</SectionHeader>
          <div className="mt-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-cocoa-500">{t('chemistry:detail.browning.bandLabel')}</span>
              <span className="font-medium text-cocoa-900">
                {t(`chemistry:detail.browning.band.${physics.browning.band}` as any)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-cocoa-500">{t('chemistry:detail.browning.indexLabel')}</span>
              <span className="font-mono">{physics.browning.index.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cocoa-500">{t('chemistry:detail.browning.cookValueLabel')}</span>
              <span className="font-mono">
                {t('chemistry:detail.browning.cookValueUnit' as any, { minutes: (physics.browning.cookValueS / 60).toFixed(1) })}
              </span>
            </div>
          </div>
          {physics.browning.flags.some(f => f.kind === 'no_reducing_sugar' || f.kind === 'no_protein') && (
            <p className="text-[11px] italic text-cocoa-500 mt-1">{t('chemistry:detail.browning.noReactants')}</p>
          )}
          <p className="text-[11px] text-cocoa-500 mt-2 leading-relaxed">{t('chemistry:detail.browning.explanation')}</p>
        </>
      )}

      {/* Thermal doneness (core-temperature model) */}
      {physics.doneness && (
        <>
          <SectionHeader className="mt-5">{t('chemistry:detail.doneness.title')}</SectionHeader>
          <div className="mt-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-cocoa-500">{t('chemistry:detail.doneness.bandLabel')}</span>
              <span className="font-medium text-cocoa-900">
                {t(`chemistry:detail.doneness.band.${physics.doneness.band}` as any)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-cocoa-500">{t('chemistry:detail.doneness.peakLabel')}</span>
              <span className="font-mono">{physics.doneness.peakCoreTempC.toFixed(1)} °C</span>
            </div>
          </div>
          {physics.doneness.flags.some(f => f.kind === 'lumped_capacitance_invalid') && (
            <p className="text-[11px] italic text-cocoa-500 mt-1">{t('chemistry:detail.doneness.biotWarning')}</p>
          )}
          <p className="text-[11px] text-cocoa-500 mt-2 leading-relaxed">{t('chemistry:detail.doneness.caveat')}</p>
        </>
      )}

      {/* Lipid oxidation (storage rancidity) — only for fat-bearing products */}
      {physics.oxidation && physics.oxidation.band !== 'none' && (
        <>
          <SectionHeader className="mt-5">{t('chemistry:detail.oxidation.title')}</SectionHeader>
          <div className="mt-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-cocoa-500">{t('chemistry:detail.oxidation.bandLabel')}</span>
              <span className="font-medium text-cocoa-900">
                {t(`chemistry:detail.oxidation.band.${physics.oxidation.band}` as any)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-cocoa-500">{t('chemistry:detail.oxidation.indexLabel')}</span>
              <span className="font-mono">{physics.oxidation.index.toFixed(2)}</span>
            </div>
          </div>
          {physics.oxidation.flags.some(f => f.kind === 'unsaturated_fat_estimated') && (
            <p className="text-[11px] italic text-cocoa-500 mt-1">{t('chemistry:detail.oxidation.estimatedFatNote')}</p>
          )}
          <p className="text-[11px] text-cocoa-500 mt-2 leading-relaxed">{t('chemistry:detail.oxidation.caveat')}</p>
        </>
      )}

      {/* Moisture migration — only when there is a multi-phase a_w gradient */}
      {physics.moisture && physics.moisture.band !== 'none' && (
        <>
          <SectionHeader className="mt-5">{t('chemistry:detail.moisture.title')}</SectionHeader>
          <div className="mt-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-cocoa-500">{t('chemistry:detail.moisture.bandLabel')}</span>
              <span className="font-medium text-cocoa-900">
                {t(`chemistry:detail.moisture.band.${physics.moisture.band}` as any)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-cocoa-500">{t('chemistry:detail.moisture.gapLabel')}</span>
              <span className="font-mono">{physics.moisture.drivingAwGap.toFixed(3)}</span>
            </div>
          </div>
          <p className="text-[11px] text-cocoa-500 mt-2 leading-relaxed">{t('chemistry:detail.moisture.caveat')}</p>
        </>
      )}

      {/* Structure & texture */}
      {(physics.emulsion.type !== 'none' || physics.foam.band !== 'none' || physics.gelation || physics.aw.waterPct > 5) && (
        <>
          <SectionHeader className="mt-5">{t('chemistry:detail.structure.title')}</SectionHeader>
          <div className="mt-2 text-xs space-y-1">
            {physics.emulsion.type !== 'none' && (
              <div className="flex justify-between">
                <span className="text-cocoa-500">{t('chemistry:detail.structure.emulsion.label')}</span>
                <span className="font-medium text-cocoa-900">
                  {t(`chemistry:detail.structure.emulsion.type.${physics.emulsion.type}` as any)}
                  {' · '}
                  {t(`chemistry:detail.structure.emulsion.stability.${physics.emulsion.stability}` as any)}
                </span>
              </div>
            )}
            {physics.foam.band !== 'none' && (
              <div className="flex justify-between">
                <span className="text-cocoa-500">{t('chemistry:detail.structure.foam.label')}</span>
                <span className="font-medium text-cocoa-900">{t(`chemistry:detail.structure.foam.band.${physics.foam.band}` as any)}</span>
              </div>
            )}
            {physics.aw.waterPct > 5 && (
              <div className="flex justify-between">
                <span className="text-cocoa-500">{t('chemistry:detail.structure.rheology.label')}</span>
                <span className="font-medium text-cocoa-900">
                  {t(`chemistry:detail.structure.rheology.consistency.${physics.rheology.consistency}` as any)}
                  {' · '}
                  {t(`chemistry:detail.structure.rheology.flow.${physics.rheology.flowType}` as any)}
                </span>
              </div>
            )}
            {physics.gelation && (
              <div className="flex justify-between">
                <span className="text-cocoa-500">{t('chemistry:detail.structure.gelation.label')}</span>
                <span className="font-medium text-cocoa-900">
                  {t(`chemistry:detail.structure.gelation.agent.${physics.gelation.agent}` as any)}
                  {' · '}
                  {physics.gelation.gels
                    ? (physics.gelation.setTempC !== null
                        ? t('chemistry:detail.structure.gelation.setsAt' as any, { temp: physics.gelation.setTempC })
                        : t('chemistry:detail.structure.gelation.sets'))
                    : t('chemistry:detail.structure.gelation.wontSet')}
                </span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-cocoa-500 mt-2 leading-relaxed">{t('chemistry:detail.structure.caveat')}</p>
        </>
      )}

      {/* Aw band interpretation */}
      <SectionHeader className="mt-5">{t('chemistry:detail.bands.title')}</SectionHeader>
      <div className="mt-2 space-y-1">
        {AW_BANDS_FOR_TABLE.map(b => (
          <div
            key={b.key}
            className={`grid grid-cols-[110px_1fr] gap-3 py-1 text-xs ${
              physics.awBand.key === b.key ? 'font-medium text-cocoa-900' : 'text-cocoa-600'
            }`}
          >
            <span className="font-mono">
              {physics.awBand.key === b.key && '▸ '}
              {b.range}
            </span>
            <span>{t(`chemistry:bands.interpretation.${b.key}` as any)}</span>
          </div>
        ))}
      </div>

      {/* Composition source counts */}
      <SectionHeader className="mt-5">{t('chemistry:detail.source.label')}</SectionHeader>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cocoa-600">
        {(Object.entries(sourceCounts) as Array<[CompositionSource, number]>).map(([src, count]) => (
          <span key={src}>{t(`chemistry:detail.source.${src}` as any, { count })}</span>
        ))}
      </div>

      {/* Calibration footnote */}
      <p className="text-[11px] text-cocoa-500 mt-5 leading-relaxed">
        {t('chemistry:detail.norrish.constants')}
      </p>
    </div>
  );
}

function SectionHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h4 className={`font-serif text-[12px] uppercase tracking-wider text-cocoa-500 font-medium ${className}`}>
      {children}
    </h4>
  );
}
