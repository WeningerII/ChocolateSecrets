import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { CHOCOLATE_FAILURE_MODES, FailureMode, FailureSeverity, lookupChocolateFailureModes } from '../services/culinaryTools';

interface FailureModeSheetProps {
  open: boolean;
  onClose: () => void;
  /** Optional action type to pre-filter the list (e.g. 'temper'). Undefined shows everything chocolate. */
  actionType?: string;
}

export default function FailureModeSheet({ open, onClose, actionType }: FailureModeSheetProps) {
  const { t } = useTranslation(['failureMode', 'failureModeCatalog']);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Reset expansion when sheet closes
  useEffect(() => {
    if (!open) setExpandedId(null);
  }, [open]);

  if (!open) return null;

  const modes = lookupChocolateFailureModes(actionType ? { actionType } : undefined);

  const headline = (() => {
    if (!actionType) return t('failureMode:headlineGeneric');
    if (actionType === 'temper') return t('failureMode:headlineTempering');
    if (actionType === 'mold') return t('failureMode:headlineMolding');
    if (actionType === 'enrobe') return t('failureMode:headlineEnrobing');
    if (actionType === 'dip') return t('failureMode:headlineDipping');
    return t('failureMode:headlineDefault', { action: actionType });
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-5 border-b border-cocoa-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-cocoa-900">{headline}</h2>
            <p className="text-sm text-cocoa-500 mt-1">{t('failureMode:subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-cocoa-500 hover:text-cocoa-900 rounded hover:bg-cocoa-100"
            aria-label={t('failureMode:close')}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="overflow-y-auto flex-1 divide-y divide-cocoa-100">
          {modes.length === 0 ? (
            <div className="p-8 text-center text-sm text-cocoa-500 italic">
              {t('failureMode:noModes')}
            </div>
          ) : (
            modes.map(mode => (
              <FailureModeCard
                key={mode.id}
                mode={mode}
                expanded={expandedId === mode.id}
                onToggle={() => setExpandedId(expandedId === mode.id ? null : mode.id)}
                t={t}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FailureModeCard({
  mode,
  expanded,
  onToggle,
  t,
}: {
  mode: FailureMode;
  expanded: boolean;
  onToggle: () => void;
  t: any;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-6 py-4 hover:bg-cream/50 flex items-start justify-between gap-3"
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <SeverityIcon severity={mode.severity} t={t} />
            <span className="font-medium text-cocoa-900">{t(`failureModeCatalog:${mode.id}.title`, mode.title)}</span>
          </div>
          <p className="text-sm text-cocoa-700 mt-1 leading-relaxed">{t(`failureModeCatalog:${mode.id}.symptom`, mode.symptom)}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-cocoa-500 shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-6 pb-5 space-y-4 bg-cream/30">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-cocoa-500 font-medium mb-1.5">{t('failureMode:cause')}</div>
            <p className="text-sm text-cocoa-900 leading-relaxed">{t(`failureModeCatalog:${mode.id}.cause`, mode.cause)}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="text-[11px] uppercase tracking-wider text-cocoa-500 font-medium">{t('failureMode:recovery')}</div>
              {mode.severity === 'fatal' && (
                <span className="text-[10px] uppercase tracking-wider text-raspberry font-medium bg-raspberry/10 px-1.5 py-0.5 rounded">
                  {t('failureMode:cannotRepair')}
                </span>
              )}
            </div>
            <ol className="text-sm text-cocoa-900 space-y-1.5 list-decimal list-outside ml-5">
              {(t(`failureModeCatalog:${mode.id}.recovery`, { returnObjects: true, defaultValue: mode.recovery }) as string[]).map((step, i) => (
                <li key={i} className="leading-relaxed">{step}</li>
              ))}
            </ol>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-cocoa-500 font-medium mb-1.5">{t('failureMode:prevention')}</div>
            <ul className="text-sm text-cocoa-900 space-y-1.5 list-disc list-outside ml-5">
              {(t(`failureModeCatalog:${mode.id}.prevention`, { returnObjects: true, defaultValue: mode.prevention }) as string[]).map((step, i) => (
                <li key={i} className="leading-relaxed">{step}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function SeverityIcon({ severity, t }: { severity: FailureSeverity; t: any }) {
  if (severity === 'fatal') {
    return <AlertTriangle className="w-4 h-4 text-raspberry shrink-0" aria-label={t('failureMode:severity.fatal')} />;
  }
  if (severity === 'safety') {
    return <AlertTriangle className="w-4 h-4 text-raspberry shrink-0" aria-label={t('failureMode:severity.safety')} />;
  }
  if (severity === 'quality') {
    return <AlertCircle className="w-4 h-4 text-copper shrink-0" aria-label={t('failureMode:severity.quality')} />;
  }
  return <Info className="w-4 h-4 text-cocoa-500 shrink-0" aria-label={t('failureMode:severity.cosmetic')} />;
}
