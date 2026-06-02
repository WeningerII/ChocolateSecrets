import { useTranslation } from 'react-i18next';

export type SupportedLanguage = 'en' | 'es' | 'ko';

export function useLanguage(): SupportedLanguage {
  const { i18n } = useTranslation();
  const base = i18n.language.split('-')[0];
  if (base === 'es' || base === 'ko') return base;
  return 'en';
}
