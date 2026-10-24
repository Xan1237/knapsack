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

/** Start closed, open around the long side, then close after the last item lands. */
export function landingClosure(progress: number): number {
  if (progress < 0.12) {
    const t = Math.max(0, progress / 0.12);
    return 1 - t * t * (3 - 2 * t);
  }
  return landingReadyToClose(progress) ? 1 : 0;
}
