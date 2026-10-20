const BEST_TIME_KEY = 'precursor-survivors:best-time';

/** Minimal slice of the Storage API so tests can pass an in-memory fake. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

/** Best survival time in seconds, or 0. Storage can be missing or throw (private mode, blocked site data). */
export function loadBestTime(store: KeyValueStore | undefined): number {
  try {
    const value = Number(store?.getItem(BEST_TIME_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** Saves `time` if it beats the stored best. Returns true for a new record. */
export function saveBestTime(store: KeyValueStore | undefined, time: number): boolean {
  if (time <= loadBestTime(store)) return false;
  try {
    store?.setItem(BEST_TIME_KEY, String(Math.floor(time)));
  } catch {
    // Not persisted, but it still counts as a record for this run
  }
  return true;
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
