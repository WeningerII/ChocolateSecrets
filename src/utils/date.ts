import { Timestamp, FieldValue } from 'firebase/firestore';

export function parseFirestoreDate(
  value:
    | Timestamp
    | FieldValue
    | Date
    | string
    | { seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number }
    | null
    | undefined,
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

  // Serialized Firestore timestamps arrive as plain objects (from Cloud Functions /
  // Firestore REST) rather than Timestamp instances: { _seconds, _nanoseconds } or
  // { seconds, nanoseconds }. Handle them before falling back.
  if (typeof value === 'object') {
    const serialized = value as {
      seconds?: number;
      nanoseconds?: number;
      _seconds?: number;
      _nanoseconds?: number;
    };
    const seconds = serialized._seconds ?? serialized.seconds;
    if (typeof seconds === 'number') {
      const nanos = serialized._nanoseconds ?? serialized.nanoseconds ?? 0;
      return new Date(seconds * 1000 + nanos / 1e6);
    }
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
