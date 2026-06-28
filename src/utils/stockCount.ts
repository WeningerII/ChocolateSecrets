import type { StockPosition } from '../types';

/** An empty by-container count (no containers, no loose units). */
export const EMPTY_STOCK_COUNT: StockPosition = {
  containerCount: 0,
  unitsPerContainer: 0,
  looseUnits: 0,
};

/**
 * Total counted units from a by-container breakdown:
 *   containerCount × unitsPerContainer + looseUnits
 * Missing/NaN fields are treated as 0 so partially-filled inputs stay safe.
 */
export function computeCountedQty(count: StockPosition): number {
  const containers = Number(count.containerCount) || 0;
  const perContainer = Number(count.unitsPerContainer) || 0;
  const loose = Number(count.looseUnits) || 0;
  return containers * perContainer + loose;
}
