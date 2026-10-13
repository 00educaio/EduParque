export const MEMORY_SHUFFLE_DURATION_MS = 7_000;
export const MEMORY_SHUFFLE_STEP_MS = 620;
export const MEMORY_SHUFFLE_SETTLE_MS = 680;

/** Keeps the visual shuffle aligned with the shared session start time. */
export function memoryShuffleRemaining(startedAt: string | null | undefined, now = Date.now(), reducedMotion = false) {
  if (!startedAt || reducedMotion) return 0;
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) return 0;
  return Math.max(0, MEMORY_SHUFFLE_DURATION_MS - Math.max(0, now - startedAtMs));
}
