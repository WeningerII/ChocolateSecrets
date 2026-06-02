import { Language } from '../types';

export const formatCurrency = (amount: number, lang: Language): string => {
  const locales = { en: 'en-US', es: 'es-ES', ko: 'ko-KR' };
  return new Intl.NumberFormat(locales[lang], {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

