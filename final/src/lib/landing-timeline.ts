export const LANDING_ITEM_COUNT = 8;
const PACKING_START = 0.1;
const PACKING_END = 0.9;

export function landingPackingProgress(progress: number): number {
  return Math.min(
    1,
    Math.max(0, (progress - PACKING_START) / (PACKING_END - PACKING_START)),
  );
}

/** Each essential gets its own scroll interval, with no overlapping arrivals. */
export function landingItemProgress(progress: number, index: number): number {
  const amount = landingPackingProgress(progress) * LANDING_ITEM_COUNT - index;
  if (amount < 1e-9) return 0;
  if (amount > 1 - 1e-9) return 1;
  return amount;
}

export function landingPackedCount(progress: number): number {
  return Math.min(
    LANDING_ITEM_COUNT,
    Math.floor(landingPackingProgress(progress) * LANDING_ITEM_COUNT + 1e-9),
  );
}
