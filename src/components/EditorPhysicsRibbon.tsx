import { useTranslation } from 'react-i18next';
import type { RecipePhysics } from '../hooks/useRecipePhysics';

interface EditorPhysicsRibbonProps {
  physics: RecipePhysics | null;
}

export function EditorPhysicsRibbon({ physics }: EditorPhysicsRibbonProps) {
  const { t } = useTranslation('chemistry');

  if (!physics) {
    return (
      <div className="px-4 py-2.5 bg-cream-50 border border-cream-200 rounded-md text-xs text-cocoa-500">
        {t('editor.ribbon.empty' as any)}
      </div>
    );
  }

  const aw = physics.aw.aw;
  const showPH = physics.pH !== null;

  return (
    <div className="px-4 py-2.5 bg-cream-50 border border-cream-200 rounded-md flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
      <Tile label={t('tier.aw' as any)} value={aw === null ? '—' : aw.toFixed(3)} caption={t(physics.awBand.labelKey as any)} />
      {showPH && <Tile label={t('tier.ph' as any)} value={physics.pH!.pH.toFixed(2)} />}
      <Tile label={t('tier.aqueousSugar' as any)} value={`${Math.round(physics.aw.aqueousSugarPct)}%`} />
      <Tile label={t('tier.totalFat' as any)} value={`${Math.round(physics.aw.fatPct)}%`} caption={t(physics.fatRegime.labelKey as any)} />
      <Tile label={t('strip.shelfLife' as any)} value={t('shelfLife.weeksOther' as any, { count: physics.shelfLife.weeks })} />
    </div>
  );
}

function Tile({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-cocoa-500">{label}</span>
      <span className="font-mono text-cocoa-900">{value}</span>
      {caption && <span className="text-[10px] italic text-cocoa-500">{caption}</span>}
    </div>
  );
}
