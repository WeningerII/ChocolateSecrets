import { describe, it, expect, test } from 'vitest';
import { depleteStock, computeProducedLotExpiry, appendPriceHistoryIfChanged } from './inventory';
import { Lot, Recipe, Ingredient } from '../types';
import { Timestamp } from 'firebase/firestore';

describe('computeProducedLotExpiry', () => {
  it('uses recipe shelfLifeDays when present', () => {
    const recipe = { haccp: { shelfLifeDays: 21 } } as Recipe;
    const now = new Date('2026-01-01T12:00:00Z');
    const { expiresAt, usedDefault } = computeProducedLotExpiry(recipe, now);
    expect(usedDefault).toBe(false);
    
    const expected = new Date('2026-01-22T12:00:00Z');
    expect(expiresAt.toDate().getTime()).toBe(expected.getTime());
  });

  it('falls back to default when shelfLifeDays missing', () => {
    const recipe = {} as Recipe;
    const { usedDefault } = computeProducedLotExpiry(recipe);
    expect(usedDefault).toBe(true);
  });

  it('falls back to default when shelfLifeDays is zero or negative', () => {
    expect(computeProducedLotExpiry({ haccp: { shelfLifeDays: 0 } } as Recipe).usedDefault).toBe(true);
    expect(computeProducedLotExpiry({ haccp: { shelfLifeDays: -1 } } as Recipe).usedDefault).toBe(true);
  });

  it('handles undefined recipe', () => {
    const { usedDefault } = computeProducedLotExpiry(undefined);
    expect(usedDefault).toBe(true);
  });
});

describe('appendPriceHistoryIfChanged', () => {
  test('seeds a new history array for an ingredient with none', () => {
    const result = appendPriceHistoryIfChanged(undefined, 5.00, 'Test Supplier');
    expect(result).toHaveLength(1);
    expect(result[0].costPerUnit).toBe(5.00);
    expect(result[0].supplier).toBe('Test Supplier');
  });

  test('appends when cost changes', () => {
    const ingredient = {
      costPerUnit: 4.00,
      priceHistory: [{ date: Timestamp.now(), costPerUnit: 4.00, supplier: 'Old' }],
    } as Ingredient;
    const result = appendPriceHistoryIfChanged(ingredient, 5.00, 'New');
    expect(result).toHaveLength(2);
    expect(result[1].costPerUnit).toBe(5.00);
    expect(result[1].supplier).toBe('New');
  });

  test('does not append when cost is unchanged', () => {
    const ingredient = {
      costPerUnit: 5.00,
      priceHistory: [{ date: Timestamp.now(), costPerUnit: 5.00, supplier: 'Same' }],
    } as Ingredient;
    const result = appendPriceHistoryIfChanged(ingredient, 5.00, 'Same');
    expect(result).toHaveLength(1);
  });

  test('treats undefined prior cost as a change (first-time seed)', () => {
    const ingredient = { priceHistory: [] } as any as Ingredient;
    const result = appendPriceHistoryIfChanged(ingredient, 5.00, 'First');
    expect(result).toHaveLength(1);
  });
});

describe('depleteStock', () => {
  it('depletes stock from a single lot', () => {
    const lots: Lot[] = [
      { id: 'lot1', ingredientId: 'ing1', quantity: 100, initialQuantity: 100, costPerUnit: 1, receivedAt: Timestamp.fromDate(new Date()), expiresAt: null }
    ];
    
    const result = depleteStock(lots, 50);
    
    expect(result.updatedLots.length).toBe(1);
    expect(result.updatedLots[0].quantity).toBe(50);
    expect(result.modifiedLots.length).toBe(1);
    expect(result.consumedLots.length).toBe(1);
    expect(result.consumedLots[0].amount).toBe(50);
    expect(result.remainingAmount).toBe(0);
  });

  it('depletes stock across multiple lots (FIFO)', () => {
    const lots: Lot[] = [
      { id: 'lot1', ingredientId: 'ing1', quantity: 50, initialQuantity: 50, costPerUnit: 1, receivedAt: Timestamp.fromDate(new Date(2023, 1, 1)), expiresAt: null },
      { id: 'lot2', ingredientId: 'ing1', quantity: 100, initialQuantity: 100, costPerUnit: 2, receivedAt: Timestamp.fromDate(new Date(2023, 1, 2)), expiresAt: null }
    ];
    
    const result = depleteStock(lots, 75);
    
    expect(result.updatedLots.length).toBe(1);
    expect(result.updatedLots[0].id).toBe('lot2');
    expect(result.updatedLots[0].quantity).toBe(75);
    
    expect(result.modifiedLots.length).toBe(2);
    
    expect(result.consumedLots.length).toBe(2);
    expect(result.consumedLots[0].amount).toBe(50); // From lot1
    expect(result.consumedLots[1].amount).toBe(25); // From lot2
    
    expect(result.remainingAmount).toBe(0);
  });

  it('handles insufficient stock', () => {
    const lots: Lot[] = [
      { id: 'lot1', ingredientId: 'ing1', quantity: 50, initialQuantity: 50, costPerUnit: 1, receivedAt: Timestamp.fromDate(new Date()), expiresAt: null }
    ];
    
    const result = depleteStock(lots, 75);
    
    expect(result.updatedLots.length).toBe(0);
    expect(result.modifiedLots.length).toBe(1);
    expect(result.consumedLots.length).toBe(1);
    expect(result.consumedLots[0].amount).toBe(50);
    expect(result.remainingAmount).toBe(25);
  });
});
