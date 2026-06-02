import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { SupportedLanguage, SUPPORTED_LANGUAGES } from '../types';

interface TranslationTabsProps {
  /**
   * The canonical (source-language) value. Editing the source-language
   * tab calls onSourceChange.
   */
  sourceValue: string;
  /**
   * The source language for this field. The tab for this language is
   * anchored first and is the only tab that writes to `sourceValue`.
   * If not specified, defaults to the current UI language — which is
   * the right default for a brand-new recipe being authored from scratch.
   */
  sourceLanguage?: SupportedLanguage;
  /**
   * Curated translations keyed by language. Editing a non-source tab
   * updates the corresponding entry in this map via onTranslationsChange.
   */
  translations: Partial<Record<SupportedLanguage, string>>;
  onSourceChange: (value: string) => void;
  onTranslationsChange: (translations: Partial<Record<SupportedLanguage, string>>) => void;
  /**
   * Render mode. 'input' uses a single-line text input; 'textarea' uses
   * a multi-line textarea. Step instructions and recipe descriptions
   * use 'textarea'; recipe names use 'input'.
   */
  mode: 'input' | 'textarea';
  /**
   * Per-tab placeholder. The same string is used across all tabs for now;
   * a future enhancement could localize per-language.
   */
  placeholder?: string;
  /**
   * Optional className applied to the input/textarea element.
   */
  inputClassName?: string;
  /**
   * Optional className applied to the wrapper div.
   */
  className?: string;
  /**
   * Optional render-prop for a per-tab adornment slot (e.g., provenance
   * badge for the source-language tab). Receives the tab's language and
   * a flag indicating whether this is the source-language tab.
   */
  renderTabAdornment?: (lang: SupportedLanguage, isSourceTab: boolean) => React.ReactNode;
}

/**
 * Tabbed translation editor. Exposes one tab per supported language.
 *
 * The source-language tab is anchored first and is visually distinguished
 * (slightly heavier border). Editing it writes to `sourceValue`.
 *
 * Other tabs write to `translations[lang]`. An empty value in a non-source
 * tab is encoded as a delete from the translations map (preserves the
 * map's "only populated languages exist as keys" invariant).
 *
 * The component does NOT manage focus or auto-switch tabs on language
 * picker change — that's a UX call we're explicitly leaving to the user.
 * The default selected tab is the source language.
 */
export function TranslationTabs({
  sourceValue,
  sourceLanguage,
  translations,
  onSourceChange,
  onTranslationsChange,
  mode,
  placeholder,
  inputClassName = 'w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper',
  className = '',
  renderTabAdornment,
}: TranslationTabsProps) {
  const { t } = useTranslation('common');
  const uiLang = useLanguage();
  const effectiveSourceLanguage = sourceLanguage ?? uiLang;

  // Tab order: source language first, then other languages in SUPPORTED_LANGUAGES order.
  const tabOrder = useMemo<SupportedLanguage[]>(() => {
    const others = SUPPORTED_LANGUAGES.filter(l => l !== effectiveSourceLanguage);
    return [effectiveSourceLanguage, ...others];
  }, [effectiveSourceLanguage]);

  const [selectedTab, setSelectedTab] = useState<SupportedLanguage>(effectiveSourceLanguage);

  const isSourceTab = selectedTab === effectiveSourceLanguage;
  const valueForTab = isSourceTab ? sourceValue : (translations[selectedTab] ?? '');

  const handleChange = (next: string) => {
    if (isSourceTab) {
      onSourceChange(next);
    } else {
      const updated = { ...translations };
      if (next.length === 0) {
        delete updated[selectedTab];
      } else {
        updated[selectedTab] = next;
      }
      onTranslationsChange(updated);
    }
  };

  const InputTag = mode === 'textarea' ? 'textarea' : 'input';

  return (
    <div className={className}>
      <div className="flex gap-1 mb-1.5 border-b border-cocoa-100">
        {tabOrder.map(lang => {
          const isActive = lang === selectedTab;
          const isSource = lang === effectiveSourceLanguage;
          const hasContent = isSource ? sourceValue.length > 0 : (translations[lang]?.length ?? 0) > 0;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => setSelectedTab(lang)}
              className={`
                relative px-3 py-1.5 text-xs font-medium transition-colors
                ${isActive
                  ? 'text-cocoa-900 border-b-2 border-copper -mb-px'
                  : 'text-cocoa-500 hover:text-cocoa-700 border-b-2 border-transparent -mb-px'}
                ${isSource ? 'font-semibold' : ''}
              `}
            >
              <span>{t(`common:languages.${lang}`)}</span>
              {hasContent && (
                <span
                  className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${isActive ? 'bg-copper' : 'bg-cocoa-300'}`}
                  aria-label={t('common:translationTabs.hasContent')}
                />
              )}
              {renderTabAdornment && (
                <span className="ml-1.5">{renderTabAdornment(lang, isSource)}</span>
              )}
            </button>
          );
        })}
      </div>
      <InputTag
        type={mode === 'input' ? 'text' : undefined}
        value={valueForTab}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClassName} ${mode === 'textarea' ? 'min-h-[60px]' : ''}`}
      />
      {!isSourceTab && (
        <p className="mt-1 text-[10px] text-cocoa-400">
          {t('common:translationTabs.translationHint' as any, { sourceLanguage: t(`common:languages.${effectiveSourceLanguage}`) })}
        </p>
      )}
    </div>
  );
}
