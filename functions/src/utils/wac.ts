export function computeWAC(
  currentStock: number,
  currentWAC: number,
  receivedQty: number,
  receivedCostPerUnit: number
): number {
  const newStock = currentStock + receivedQty;
  if (newStock <= 0) return currentWAC;
  return (currentStock * currentWAC + receivedQty * receivedCostPerUnit) / newStock;
}
