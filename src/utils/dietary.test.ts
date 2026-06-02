import { describe, it, expect } from 'vitest';
import { deriveIngredientDietaryFlags, deriveRecipeDietaryFlags } from './dietary';

describe('Dietary Derivation', () => {
  it('should flag an ingredient as lactose_free if lactose is zero or undefined', () => {
    expect(deriveIngredientDietaryFlags(undefined)).toEqual(['lactose_free']);
    expect(deriveIngredientDietaryFlags({ lactose: 0 } as any)).toEqual(['lactose_free']);
  });

  it('should flag an ingredient as low_lactose if lactose is below threshold', () => {
    expect(deriveIngredientDietaryFlags({ lactose: 0.4 } as any)).toEqual(['low_lactose']);
  });

  it('should flag an ingredient as lactose_present if lactose exceeds threshold', () => {
    expect(deriveIngredientDietaryFlags({ lactose: 0.6 } as any)).toEqual(['lactose_present']);
  });

  it('should flag a recipe as lactose_free if no lactose is present', () => {
    // 0 lactose%, 100g, 1 serving => 0g lactose => free
    expect(deriveRecipeDietaryFlags([0], [100], 1)).toEqual(['lactose_free']);
  });

  it('should flag a recipe as low_lactose if per-serving lactose is below threshold', () => {
    // 1% lactose, 50g => 0.5g lactose total => 1 serving => 0.5g per serving => low
    expect(deriveRecipeDietaryFlags([1], [50], 1)).toEqual(['low_lactose']);
  });

  it('should flag a recipe as lactose_present if per-serving lactose exceeds threshold', () => {
    // 10% lactose, 50g => 5g lactose total => 1 serving => 5g per serving => present
    expect(deriveRecipeDietaryFlags([10], [50], 1)).toEqual(['lactose_present']);
  });
});
