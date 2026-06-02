export function computeWAC(
  currentStock: number,
  currentWAC: number,
  receivedQty: number,
  receivedCostPerUnit: number
): number {
  // Only on-hand (non-negative) stock carries a cost basis. If stock was driven
  // negative by over-consumption booked before a delivery, that deficit must not
  // weight the average — otherwise a receipt's cost is distorted (a negative prior
  // quantity injects phantom cost, e.g. goods bought at $8 reporting a WAC of $10,
  // or the receipt being discarded entirely when newStock crosses back through 0).
  const basisQty = Math.max(currentStock, 0);
  const totalQty = basisQty + receivedQty;
  if (totalQty <= 0) return currentWAC;
  return (basisQty * currentWAC + receivedQty * receivedCostPerUnit) / totalQty;
}
