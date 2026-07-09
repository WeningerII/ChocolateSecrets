export type Language = 'en' | 'es' | 'ko';

export type SupportedLanguage = 'en' | 'es' | 'ko';

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['en', 'es', 'ko'] as const;

/**
 * Canonical shape for any user-entered text that needs to render in multiple languages.
 *
 * - `source` is the original input as the user wrote it (or as Gemini extracted it).
 * - `sourceLanguage` is the language `source` is in. Always set explicitly.
 * - `translations` holds curated translations into other languages, optional.
 *
 * The render layer (Phase 3) uses `getLocalizedText(field, currentLanguage)` to
 * resolve the right string for display.
 */
export interface LocalizedString {
  source: string;
  sourceLanguage: SupportedLanguage;
  translations?: Partial<Record<SupportedLanguage, string>>;
}
