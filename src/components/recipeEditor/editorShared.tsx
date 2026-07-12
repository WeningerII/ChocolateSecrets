import React from 'react';
import { useTranslation } from 'react-i18next';
import { Thermometer, Snowflake, Scissors, Settings, RefreshCw, Package, FileText } from 'lucide-react';
import { Provenance, FieldMeta } from '../../types';

export function ProvenanceBadge({ meta }: { meta?: FieldMeta }) {
  const { t } = useTranslation(['recipes']);
  if (!meta?.provenance) return null;
  const label: Record<Provenance, string> = {
    verbatim: t('recipes:editor.provenance.fromCard'),
    inferred_high: t('recipes:editor.provenance.inferred'),
    inferred_low: t('recipes:editor.provenance.guess'),
    user_confirmed: t('recipes:editor.provenance.confirmed'),
    user_edited: t('recipes:editor.provenance.edited'),
  };
  const color: Record<Provenance, string> = {
    verbatim: 'text-pistachio',
    inferred_high: 'text-copper',
    inferred_low: 'text-raspberry',
    user_confirmed: 'text-cocoa-500',
    user_edited: 'text-cocoa-300',
  };
  return (
    <span
      className={`text-[10px] font-medium uppercase tracking-wide ${color[meta.provenance]}`}
      title={meta.source ? `Source: ${meta.source}` : undefined}
    >
      {label[meta.provenance]}
    </span>
  );
}

export function ConfidenceDot({ confidence, label }: { confidence?: number; label?: string }) {
  if (confidence === undefined) return null;
  const color = confidence >= 0.85 ? 'bg-emerald-500' : confidence >= 0.7 ? 'bg-vanilla-cream0' : 'bg-red-500';
  const title = `${label || 'AI confidence'}: ${Math.round(confidence * 100)}%`;
  return <span className={`inline-block w-2 h-2 rounded-full ${color} ml-1.5 align-middle`} title={title} />;
}

export const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'heat': return <Thermometer className="w-4 h-4 text-orange-500" />;
    case 'cool': return <Snowflake className="w-4 h-4 text-blue-500" />;
    case 'chop': return <Scissors className="w-4 h-4 text-cocoa-500" />;
    case 'grind': return <Settings className="w-4 h-4 text-cocoa-500" />;
    case 'mix': return <RefreshCw className="w-4 h-4 text-emerald-500" />;
    case 'jar': return <Package className="w-4 h-4 text-copper" />;
    default: return <FileText className="w-4 h-4 text-cocoa-300" />;
  }
};
