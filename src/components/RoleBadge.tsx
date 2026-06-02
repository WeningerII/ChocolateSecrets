import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import type { RoleTag, UniversalRole } from '../types';
import { UNIVERSAL_ROLES } from '../types';
import { ROLE_PRESENTATION } from '../services/foodScience/roles';

interface RoleBadgeProps {
  tag: RoleTag | undefined;
  onChange: (tag: RoleTag | undefined) => void;
  onAutoDetect?: () => void;
}

export function RoleBadge({ tag, onChange, onAutoDetect }: RoleBadgeProps) {
  const { t } = useTranslation('recipes');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const label = tag ? t(ROLE_PRESENTATION[tag.universal].labelKey as any) : t('recipes:role.noRole');
  const tone = !tag
    ? 'border-cream-300 text-cocoa-500 bg-cream-50'
    : tag.provenance === 'inferred_low'
      ? 'border-copper-300 text-copper-700 bg-copper-50'
      : 'border-cocoa-200 text-cocoa-700 bg-cream-50';

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`text-[11px] uppercase tracking-wide font-medium px-2 py-0.5 rounded border ${tone} inline-flex items-center gap-1 hover:bg-cream-100 transition-colors`}
        title={tag ? t(`recipes:role.confidence.${tag.provenance === 'user_edited' || tag.provenance === 'user_confirmed' ? 'manual' : tag.provenance === 'inferred_high' ? 'high' : 'low'}`) : ''}
      >
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-cream-200 rounded-md shadow-lg w-44">
          {onAutoDetect && (
            <button
              type="button"
              onClick={() => { onAutoDetect(); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-cream-100 text-cocoa-700 inline-flex items-center gap-1.5 border-b border-cream-200"
            >
              <Sparkles className="w-3 h-3" />
              {t('recipes:role.infer')}
            </button>
          )}
          <button
            type="button"
            onClick={() => { onChange(undefined); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-cream-100 text-cocoa-500"
          >
            {t('recipes:role.noRole')}
          </button>
          {UNIVERSAL_ROLES.map(role => (
            <button
              key={role}
              type="button"
              onClick={() => {
                onChange({
                  universal: role as UniversalRole,
                  provenance: 'user_edited',
                });
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-cream-100 ${
                tag?.universal === role ? 'bg-cream-100 text-cocoa-900 font-medium' : 'text-cocoa-700'
              }`}
            >
              {t(ROLE_PRESENTATION[role as UniversalRole].labelKey as any)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
