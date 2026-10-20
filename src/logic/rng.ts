export type Rng = () => number;

/** Mulberry32: tiny seeded PRNG returning floats in [0, 1). Same seed, same run. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reads `?seed=123` from a query string; undefined when absent or invalid. */
export function seedFromQuery(search: string): number | undefined {
  const raw = new URLSearchParams(search).get('seed');
  if (raw === null || raw.trim() === '') return undefined;
  const seed = Number(raw);
  return Number.isInteger(seed) ? seed : undefined;
}

export function randomBetween(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Fisher-Yates on a copy; the input array is left untouched. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
