export interface XpState {
  level: number;
  /** XP collected towards the next level. */
  xp: number;
}

export const INITIAL_XP: XpState = { level: 1, xp: 0 };

/** Precursor orbs needed to go from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return Math.round(5 + (level - 1) * 4 + Math.pow(level - 1, 1.5));
}

/** Adds XP and returns the new state plus how many levels were gained (can be more than one). */
export function gainXp(state: XpState, amount: number): { state: XpState; levelsGained: number } {
  let { level, xp } = state;
  xp += amount;
  let levelsGained = 0;
  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level++;
    levelsGained++;
  }
  return { state: { level, xp }, levelsGained };
}
