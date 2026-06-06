import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, X } from 'lucide-react';
import type { Alert, AlertSeverity } from '../types';
import { dismissAlert } from '../services/alertsService';
import { selectActiveAlerts } from '../utils/alerts';

const SEVERITY_DOT: Record<AlertSeverity, string> = {
  urgent: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
};

/**
 * Bell + dropdown listing the current user's active (non-dismissed) alerts.
 * Presentational: the alerts come from a single useAlerts() subscription held by
 * the parent, so multiple bells (desktop sidebar + mobile header) share one
 * listener. `align` controls which way the panel opens so it stays on-screen.
 */
export default function AlertsBell({
  alerts,
  align = 'right',
}: {
  alerts: Alert[];
  align?: 'left' | 'right';
}) {
  const { t } = useTranslation('alerts');
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Alert title/body keys are built server-side, so they're dynamic strings;
  // the typed t() only accepts known literal keys, so use a loose view for them.
  const translate = t as unknown as (key: string, options?: Record<string, unknown>) => string;

  const active = selectActiveAlerts(alerts);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const openAlert = (a: Alert) => {
    setOpen(false);
    if (a.actionUrl) navigate(a.actionUrl);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('alerts:ui.open')}
        aria-expanded={open}
        className="relative p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {active.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-red-500 rounded-full">
            {active.length > 9 ? '9+' : active.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden`}
        >
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-800">{t('alerts:ui.title')}</h2>
          </div>

          {active.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">{t('alerts:ui.empty')}</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-stone-100">
              {active.map((a) => (
                <li key={a.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openAlert(a)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openAlert(a);
                      }
                    }}
                    className="group flex gap-3 px-4 py-3 hover:bg-stone-50 cursor-pointer transition-colors"
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[a.severity] ?? 'bg-stone-400'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-800">{translate(a.titleKey)}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {translate(a.bodyKey, a.bodyParams ?? {})}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (a.id) dismissAlert(a.id).catch(() => { /* listener reflects truth */ });
                      }}
                      aria-label={t('alerts:ui.dismiss')}
                      className="shrink-0 self-start p-1 text-stone-300 hover:text-stone-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
