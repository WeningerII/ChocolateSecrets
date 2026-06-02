import { describe, test, expect, vi, beforeEach } from 'vitest';
import { LocalizedString } from '../types';

// We test the resolution logic at the component logic layer.
// Render-layer integration (DOM, hooks) is out of scope here — covered
// by smoke tests, not unit tests.
//
// To do that, we extract the resolution into a testable pure function.
// Add this export at the bottom of `src/components/LocalizedField.tsx`:
//
//   export function resolveLocalized(
//     field: LocalizedString | undefined,
//     legacyText: string | undefined,
//     legacyLanguage: SupportedLanguage,
//     currentLanguage: SupportedLanguage
//   ): { kind: 'raw'; text: string } | { kind: 'curated'; text: string } | { kind: 'runtime'; source: string; sourceLanguage: SupportedLanguage } | { kind: 'empty' } {
//     const effective = field
//       ? field
//       : legacyText
//         ? { source: legacyText, sourceLanguage: legacyLanguage }
//         : undefined;
//     if (!effective || !effective.source) return { kind: 'empty' };
//     if (effective.sourceLanguage === currentLanguage) {
//       return { kind: 'raw', text: effective.source };
//     }
//     const curated = effective.translations?.[currentLanguage];
//     if (curated) return { kind: 'curated', text: curated };
//     return { kind: 'runtime', source: effective.source, sourceLanguage: effective.sourceLanguage };
//   }
//
// Then the existing render code calls resolveLocalized and switches on its
// `kind` to decide whether to render directly or invoke RuntimeTranslated.

import { resolveLocalized } from './LocalizedField';

describe('resolveLocalized', () => {
  test('raw render when sourceLanguage matches current', () => {
    const field: LocalizedString = { source: 'Caramel', sourceLanguage: 'en' };
    expect(resolveLocalized(field, undefined, 'en', 'en')).toEqual({ kind: 'raw', text: 'Caramel' });
  });

  test('curated translation when present and sourceLanguage differs', () => {
    const field: LocalizedString = {
      source: 'Caramelo de mantequilla dorada',
      sourceLanguage: 'es',
      translations: { en: 'Brown butter caramel' },
    };
    expect(resolveLocalized(field, undefined, 'en', 'en')).toEqual({ kind: 'curated', text: 'Brown butter caramel' });
  });

  test('runtime fallback when sourceLanguage differs and no curated translation', () => {
    const field: LocalizedString = { source: 'Caramelo de mantequilla dorada', sourceLanguage: 'es' };
    expect(resolveLocalized(field, undefined, 'en', 'en')).toEqual({
      kind: 'runtime',
      source: 'Caramelo de mantequilla dorada',
      sourceLanguage: 'es',
    });
  });

  test('legacy text used when field is absent', () => {
    expect(resolveLocalized(undefined, 'Recipe Name', 'en', 'en')).toEqual({ kind: 'raw', text: 'Recipe Name' });
  });

  test('legacy text routes through runtime when legacyLanguage differs from current', () => {
    expect(resolveLocalized(undefined, 'Caramelo', 'es', 'en')).toEqual({
      kind: 'runtime',
      source: 'Caramelo',
      sourceLanguage: 'es',
    });
  });

  test('empty when neither field nor legacyText provides content', () => {
    expect(resolveLocalized(undefined, undefined, 'en', 'en')).toEqual({ kind: 'empty' });
    expect(resolveLocalized({ source: '', sourceLanguage: 'en' }, undefined, 'en', 'en')).toEqual({ kind: 'empty' });
  });

  test('field beats legacyText when both provided', () => {
    const field: LocalizedString = { source: 'From field', sourceLanguage: 'en' };
    expect(resolveLocalized(field, 'From legacy', 'en', 'en')).toEqual({ kind: 'raw', text: 'From field' });
  });

  test('regression: BROWN BUTTER CARAMEL — Spanish source, English UI, no curated', () => {
    // The original bug: <TranslatedText> short-circuited English mode and
    // rendered the Spanish source raw. The new component must route this
    // through the runtime translator instead.
    const field: LocalizedString = { source: 'Caramelo de mantequilla dorada', sourceLanguage: 'es' };
    const result = resolveLocalized(field, undefined, 'en', 'en');
    expect(result.kind).toBe('runtime');
    if (result.kind === 'runtime') {
      expect(result.sourceLanguage).toBe('es');
    }
  });
});
