/** A completed counter starts the automatic final close; no extra scroll needed. */
export function landingPackedCount(progress: number): number {
  return Math.min(
    8,
    Math.max(0, Math.floor((progress - 0.27 + 1e-9) / 0.074) + 1),
  );
}

export function landingReadyToClose(progress: number): boolean {
  return landingPackedCount(progress) === 8;
}
