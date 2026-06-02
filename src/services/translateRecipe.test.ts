import { describe, it, expect, vi } from 'vitest';
import { translateRecipe } from './translateRecipe';
import * as client from './translationClient';
import { Recipe } from '../types';

vi.mock('./translationClient', () => ({
  queueTranslation: vi.fn(),
}));

describe('translateRecipe on Test Recipe', () => {
  it('adds missing translations for Spanish and Korean', async () => {
    const mockQueue = vi.mocked(client.queueTranslation);
    mockQueue.mockResolvedValueOnce({ text: 'Receta de prueba', status: 'success' });
    mockQueue.mockResolvedValueOnce({ text: '테스트 레시피', status: 'success' });

    const testRecipe: Recipe = {
      id: 'test-1',
      name: 'Test Recipe',
      nameI18n: {
        sourceLanguage: 'en',
        translations: {}
      },
      // minimal fields to pass typing if necessary
    } as any;

    const proposal = await translateRecipe(testRecipe);
    
    expect(proposal.fills.length).toBe(2);
    expect(proposal.fills).toContainEqual(expect.objectContaining({ targetLanguage: 'es', text: 'Receta de prueba' }));
    expect(proposal.fills).toContainEqual(expect.objectContaining({ targetLanguage: 'ko', text: '테스트 레시피' }));
  });
});
