import { Timestamp, FieldValue } from 'firebase/firestore';

export function parseFirestoreDate(
  value: Timestamp | FieldValue | Date | string | null | undefined,
  fallback: Date = new Date()
): Date {
  if (!value) return fallback;
  
  if (value instanceof Date) return value;
  
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? fallback : parsed;
  }
  
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  
  if (typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return new Date(value.toMillis());
  }
  
  return fallback;
}

export function formatFirestoreDate(
  value: Timestamp | FieldValue | Date | string | null | undefined,
  lang: 'en' | 'es' | 'ko' = 'en',
  fallbackStr: string = ''
): string {
  if (!value) return fallbackStr;
  const date = parseFirestoreDate(value, new Date(0));
  if (date.getTime() === 0) return fallbackStr;
  
  const locales = { en: 'en-US', es: 'es-ES', ko: 'ko-KR' };
  return new Intl.DateTimeFormat(locales[lang], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
