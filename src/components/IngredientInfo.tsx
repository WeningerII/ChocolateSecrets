import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getIngredientSpec, IngredientSpec, DairySpec } from '../services/culinaryTools';
import { ChocolateSpec } from '../types';

interface IngredientInfoProps {
  /** The ingredient name to look up in the catalog. Should be the English/canonical name. */
  name: string;
  /** What to render as the visible text. Defaults to `name`. Use this when displaying a translation. */
  children?: React.ReactNode;
  /** Optional className forwarded to the wrapper span. */
  className?: string;
}

/**
 * Wraps an ingredient name in a click-to-expand affordance when the name matches
 * a known catalog (dairy for now; chocolate/tea/coffee added in later verticals).
 * Gracefully renders plain text when no match is found.
 *
 * Design notes:
 * - Click-only toggle (no hover) so mobile and desktop behave identically.
 * - Dotted underline signals "there's more here" without being loud.
 * - Outside click closes the popover.
 * - No external tooltip/popover library — pure React state + CSS.
 */
export default function IngredientInfo({ name, children, className }: IngredientInfoProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const spec = getIngredientSpec(name);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // No spec match — render the children (or name) as plain text
  if (!spec) {
    return <>{children ?? name}</>;
  }

  return (
    <span ref={wrapRef} className={`relative inline-block ${className ?? ''}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="border-b border-dotted border-cocoa-300 hover:border-cocoa-500 cursor-help text-left"
        aria-expanded={open}
      >
        {children ?? name}
      </button>
      {open && (
        <span
          className="absolute left-0 top-full mt-1 z-30 min-w-[240px] max-w-[320px] bg-white border border-cocoa-100 rounded-lg shadow-lg p-3 text-left normal-case"
          onClick={(e) => e.stopPropagation()}
        >
          <SpecContent spec={spec} />
        </span>
      )}
    </span>
  );
}

function SpecContent({ spec }: { spec: IngredientSpec }) {
  if (spec.kind === 'dairy') return <DairyContent spec={spec.data} />;
  if (spec.kind === 'chocolate') return <ChocolateContent spec={spec.data} />;
  return null;
}

function DairyContent({ spec }: { spec: DairySpec }) {
  const { t } = useTranslation(['ingredientInfo']);
  const categoryLabel = t(`ingredientInfo:dairyCategories.${spec.category}`, spec.category.replace(/_/g, ' '));
  const fatLabel = spec.fatPercentMin === spec.fatPercentMax
    ? t('ingredientInfo:fatPercentExact', { percent: spec.fatPercentMin })
    : t('ingredientInfo:fatPercentRange', { min: spec.fatPercentMin, max: spec.fatPercentMax });

  const metaBits: string[] = [];
  if (spec.origin) metaBits.push(spec.origin);
  if (spec.grassFed) metaBits.push(t('ingredientInfo:grassFed'));
  if (spec.aop) metaBits.push(t('ingredientInfo:aop'));
  if (spec.cultured) metaBits.push(t('ingredientInfo:cultured'));

  const whippingLine = (() => {
    if (spec.whippable) {
      if (spec.whippingTimeSeconds && spec.whippingTempF) {
        const minutes = `${Math.round(spec.whippingTimeSeconds[0] / 60)}–${Math.round(spec.whippingTimeSeconds[1] / 60)} min`;
        const temp = `${spec.whippingTempF[0]}°F`;
        return { text: t('ingredientInfo:whippableWithDetails', { minutes, temp }), color: 'text-pistachio' };
      }
      return { text: t('ingredientInfo:whippable'), color: 'text-pistachio' };
    }
    const showNotWhippable = spec.category === 'half_and_half'
      || spec.category === 'light_cream'
      || spec.category === 'clotted_cream'
      || spec.category === 'double_cream' && !spec.whippable;
    if (showNotWhippable) {
      return { text: t('ingredientInfo:notWhippable'), color: 'text-raspberry' };
    }
    return null;
  })();

  return (
    <span className="block space-y-1.5 text-sm">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-display font-medium text-cocoa-900 capitalize">
          {spec.brand ?? categoryLabel}
        </span>
        <span className="text-cocoa-700 text-xs whitespace-nowrap">{fatLabel}</span>
      </span>
      {metaBits.length > 0 && (
        <span className="block text-xs text-cocoa-500">{metaBits.join(' · ')}</span>
      )}
      {whippingLine && (
        <span className={`block text-xs ${whippingLine.color}`}>{whippingLine.text}</span>
      )}
      {spec.notes && (
        <span className="block text-xs text-cocoa-500 italic pt-1.5 mt-1.5 border-t border-cocoa-100">
          {spec.notes}
        </span>
      )}
    </span>
  );
}

function ChocolateContent({ spec }: { spec: ChocolateSpec }) {
  const { t } = useTranslation(['ingredientInfo']);
  // Display name: "Valrhona Guanaja" or fall back to "70% dark chocolate" or "Dark chocolate"
  const displayName = spec.productName
    ? `${spec.brand ?? ''} ${spec.productName}`.trim()
    : spec.type
      ? t(`ingredientInfo:chocolate${spec.type.charAt(0).toUpperCase()}${spec.type.slice(1)}` as any, { defaultValue: t('ingredientInfo:chocolateFallback') })
      : t('ingredientInfo:chocolateFallback');

  const tempering = spec.tempering;
  const temperingLine = tempering
    ? `${formatRange(tempering.meltCelsius)}°C → seed ${formatRange(tempering.coolCelsius)}°C → work ${formatRange(tempering.workCelsius)}°C`
    : null;

  return (
    <span className="block space-y-1.5 text-sm">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-display font-medium text-cocoa-900">{displayName}</span>
        {typeof spec.cocoaPercentage === 'number' && (
          <span className="text-cocoa-700 text-xs whitespace-nowrap font-mono">
            {t('ingredientInfo:cocoaPercent', { percent: spec.cocoaPercentage })}
          </span>
        )}
      </span>
      {spec.origin && (
        <span className="block text-xs text-cocoa-500">{spec.origin}</span>
      )}
      {temperingLine && (
        <span className="block text-xs text-copper font-mono">
          <span className="uppercase tracking-wide text-[10px] text-copper/70 mr-1.5">{t('ingredientInfo:temperLabel')}</span>
          {temperingLine}
        </span>
      )}
      {spec.flavorNotes && (
        <span className="block text-xs text-cocoa-500 italic pt-1.5 mt-1.5 border-t border-cocoa-100">
          {spec.flavorNotes}
        </span>
      )}
    </span>
  );
}

function formatRange(range: [number, number]): string {
  return range[0] === range[1] ? `${range[0]}` : `${range[0]}–${range[1]}`;
}
