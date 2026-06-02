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
