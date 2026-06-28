import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { useRuntimeTranslation } from '../hooks/useRuntimeTranslation';
import { getLocalizedText } from '../utils/localized';
import { LocalizedString, SupportedLanguage } from '../types';

interface LocalizedFieldProps {
  /**
   * The new `LocalizedString` field, preferred when present. Read directly
   * from the document (e.g. `recipe.nameI18n`, `step.instructionI18n`).
   */
  field?: LocalizedString;
  /**
   * Legacy raw string field, used when `field` is absent. This supports
   * documents that haven't been migrated yet, plus ad-hoc strings like
   * `step.equipment.join(', ')` that don't have a LocalizedString backing.
   */
  legacyText?: string;
  /**
   * Source language assumed for `legacyText`. Defaults to 'en' because
   * that's the historical assumption for raw fields. Override for fields
   * that are known to be in another language.
   */
  legacyLanguage?: SupportedLanguage;
  /**
   * Rendered when both `field` and `legacyText` are empty/missing.
   */
  placeholder?: string;
  /**
   * HTML element/tag/component to render. Defaults to 'span'.
   */
  as?: React.ElementType;
  /**
   * Class name passed to the rendered element.
   */
  className?: string;
}

/**
 * Renders user-data text in the current UI language, using a four-step
 * resolution chain:
 *
 *   1. If `field.sourceLanguage === currentLanguage` → render `field.source`.
 *   2. If `field.translations?.[currentLanguage]` exists → render that.
 *   3. Otherwise → call the runtime translator and render the result.
 *      While in flight, render `field.source` with status 'pending'.
 *      On error, render `field.source` with a small ⚠ marker.
 *   4. If `field` is absent, treat `legacyText` as a synthetic LocalizedString
 *      with `sourceLanguage = legacyLanguage` and run the same chain.
 *
 * If neither `field` nor `legacyText` provides content, render `placeholder`.
 *
 * This component replaces the Phase-1 `<TranslatedText>`. The two have the
 * same external behavior for the legacy raw-string path, but `<LocalizedField>`
 * additionally honors the source language stored on Phase-2 documents — so a
 * Spanish-source description renders raw in Spanish mode and gets translated
 * (Spanish → English) in English mode, which `<TranslatedText>` could not do.
 */
type ResolveResult =
  | { kind: 'raw'; text: string }
  | { kind: 'curated'; text: string }
  | { kind: 'runtime'; source: string; sourceLanguage: SupportedLanguage }
  | { kind: 'empty' };

/**
 * Pure function that captures the four-step resolution chain. Extracted
 * from the component body so it can be unit-tested without a DOM.
 */
export function resolveLocalized(
  field: LocalizedString | undefined,
  legacyText: string | undefined,
  legacyLanguage: SupportedLanguage,
  currentLanguage: SupportedLanguage
): ResolveResult {
  const effective: LocalizedString | undefined = field
    ? field
    : legacyText
      ? { source: legacyText, sourceLanguage: legacyLanguage }
      : undefined;
  if (!effective || !effective.source) return { kind: 'empty' };
  // getLocalizedText is the shared synchronous text extractor (source when the
  // language matches, else the curated translation); resolveLocalized adds the
  // kind classification on top so the component can fall through to runtime
  // translation when no curated translation exists.
  if (effective.sourceLanguage === currentLanguage) {
    return { kind: 'raw', text: getLocalizedText(effective, currentLanguage) };
  }
  const curated = effective.translations?.[currentLanguage];
  if (curated) return { kind: 'curated', text: getLocalizedText(effective, currentLanguage) };
  return { kind: 'runtime', source: effective.source, sourceLanguage: effective.sourceLanguage };
}

export function LocalizedField({
  field,
  legacyText,
  legacyLanguage = 'en',
  placeholder = '',
  as: Component = 'span',
  className,
}: LocalizedFieldProps) {
  const lang = useLanguage();
  const resolved = resolveLocalized(field, legacyText, legacyLanguage, lang);

  switch (resolved.kind) {
    case 'empty':
      return <Component className={className}>{placeholder}</Component>;
    case 'raw':
    case 'curated':
      return <Component className={className}>{resolved.text}</Component>;
    case 'runtime':
      return (
        <RuntimeTranslated
          source={resolved.source}
          sourceLanguage={resolved.sourceLanguage}
          targetLanguage={lang}
          as={Component}
          className={className}
        />
      );
  }
}

interface RuntimeTranslatedProps {
  source: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  as: React.ElementType;
  className?: string;
}

function RuntimeTranslated({
  source,
  sourceLanguage,
  targetLanguage,
  as: Component,
  className,
}: RuntimeTranslatedProps) {
  const { t } = useTranslation('common');
  const { text, status } = useRuntimeTranslation(source, sourceLanguage, targetLanguage);

  return (
    <Component className={className}>
      {text}
      {status === 'error' && (
        <span
          className="ml-1 inline-block text-amber-500 text-xs align-middle cursor-help select-none"
          title={t('common:translationUnavailable')}
          aria-label={t('common:translationUnavailable')}
        >
          ⚠
        </span>
      )}
    </Component>
  );
}
