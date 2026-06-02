import { describe, test, expect } from 'vitest';
import { wrapAsLocalizedForSave, isLocalizedString, getLocalizedText, attachRecipeLocalizedFields } from './localized';
import { LocalizedString, Recipe } from '../types';

describe('wrapAsLocalizedForSave', () => {
  test('no existing field → creates LocalizedString with source = newText, sourceLanguage = ui', () => {
    const result = wrapAsLocalizedForSave('Hello', undefined, 'en');
    expect(result).toEqual({ source: 'Hello', sourceLanguage: 'en' });
  });

  test('existing field with matching sourceLanguage → updates source, preserves translations', () => {
    const existing: LocalizedString = {
      source: 'Old',
      sourceLanguage: 'en',
      translations: { es: 'Viejo' },
    };
    const result = wrapAsLocalizedForSave('New', existing, 'en');
    expect(result).toEqual({
      source: 'New',
      sourceLanguage: 'en',
      translations: { es: 'Viejo' },
    });
  });

  test('existing field with non-matching sourceLanguage → updates UI-language translation, preserves source', () => {
    const existing: LocalizedString = { source: 'Caramelo', sourceLanguage: 'es' };
    const result = wrapAsLocalizedForSave('Caramel', existing, 'en');
    expect(result).toEqual({
      source: 'Caramelo',
      sourceLanguage: 'es',
      translations: { en: 'Caramel' },
    });
  });

  test('existing field with non-matching source — additional translation slot does not overwrite siblings', () => {
    const existing: LocalizedString = {
      source: 'Caramelo',
      sourceLanguage: 'es',
      translations: { ko: '캐러멜' },
    };
    const result = wrapAsLocalizedForSave('Caramel', existing, 'en');
    expect(result).toEqual({
      source: 'Caramelo',
      sourceLanguage: 'es',
      translations: { ko: '캐러멜', en: 'Caramel' },
    });
  });

  test('Spanish-speaking user editing Spanish-source field updates the source, not a translation', () => {
    const existing: LocalizedString = {
      source: 'Old Spanish',
      sourceLanguage: 'es',
      translations: { en: 'Old English' },
    };
    const result = wrapAsLocalizedForSave('New Spanish', existing, 'es');
    expect(result).toEqual({
      source: 'New Spanish',
      sourceLanguage: 'es',
      translations: { en: 'Old English' },
    });
  });

  test('English user overwrites their own English source even when other translations exist', () => {
    const existing: LocalizedString = {
      source: 'Recipe',
      sourceLanguage: 'en',
      translations: { es: 'Receta', ko: '레시피' },
    };
    const result = wrapAsLocalizedForSave('Recipe v2', existing, 'en');
    expect(result.source).toBe('Recipe v2');
    expect(result.sourceLanguage).toBe('en');
    expect(result.translations).toEqual({ es: 'Receta', ko: '레시피' });
  });
});

describe('isLocalizedString', () => {
  test('returns true for a valid LocalizedString', () => {
    expect(isLocalizedString({ source: 'x', sourceLanguage: 'en' })).toBe(true);
    expect(isLocalizedString({ source: 'x', sourceLanguage: 'es', translations: { en: 'x' } })).toBe(true);
  });

  test('returns false for legacy raw strings', () => {
    expect(isLocalizedString('hello')).toBe(false);
  });

  test('returns false for null/undefined', () => {
    expect(isLocalizedString(null)).toBe(false);
    expect(isLocalizedString(undefined)).toBe(false);
  });

  test('returns false for unknown sourceLanguage', () => {
    expect(isLocalizedString({ source: 'x', sourceLanguage: 'fr' })).toBe(false);
  });

  test('returns false for missing fields', () => {
    expect(isLocalizedString({ source: 'x' })).toBe(false);
    expect(isLocalizedString({ sourceLanguage: 'en' })).toBe(false);
  });
});

describe('getLocalizedText', () => {
  test('returns source when sourceLanguage matches', () => {
    const f: LocalizedString = { source: 'Caramel', sourceLanguage: 'en' };
    expect(getLocalizedText(f, 'en')).toBe('Caramel');
  });

  test('returns curated translation when target differs from source', () => {
    const f: LocalizedString = {
      source: 'Caramel',
      sourceLanguage: 'en',
      translations: { es: 'Caramelo' },
    };
    expect(getLocalizedText(f, 'es')).toBe('Caramelo');
  });

  test('falls back to source when no curated translation for target', () => {
    const f: LocalizedString = { source: 'Caramel', sourceLanguage: 'en' };
    expect(getLocalizedText(f, 'es')).toBe('Caramel');
  });

  test('legacy raw string passes through unchanged', () => {
    expect(getLocalizedText('Old recipe', 'es')).toBe('Old recipe');
  });

  test('undefined input returns empty string', () => {
    expect(getLocalizedText(undefined, 'en')).toBe('');
  });
});

describe('attachRecipeLocalizedFields', () => {
  test('folds nameTranslations map into nameI18n', () => {
    const rawRecipe = {
      id: 'r1',
      name: 'Cake',
      description: '',
      type: 'standard',
      nameTranslations: { es: 'Pastel', ko: '케이크' }
    } as Recipe;
    
    const result = attachRecipeLocalizedFields(rawRecipe, undefined, 'en');
    
    expect(result.nameI18n?.source).toBe('Cake');
    expect(result.nameI18n?.sourceLanguage).toBe('en');
    expect(result.nameI18n?.translations?.es).toBe('Pastel');
    expect(result.nameI18n?.translations?.ko).toBe('케이크');
  });

  test('nameTranslations override legacy fallback nameSpanish but leave other fields alone', () => {
    const rawRecipe = {
      id: 'r1',
      name: 'Cake',
      description: '',
      type: 'standard',
      nameSpanish: 'Legacy Pastel',
      nameTranslations: { es: 'New Pastel', ko: '케이크' }
    } as Recipe;
    
    const result = attachRecipeLocalizedFields(rawRecipe, undefined, 'en');
    
    // new editor state has precedence over the legacy field
    expect(result.nameI18n?.translations?.es).toBe('New Pastel');
    expect(result.nameI18n?.translations?.ko).toBe('케이크');
  });
});
