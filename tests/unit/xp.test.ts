import { describe, expect, it } from 'vitest';
import { gainXp, INITIAL_XP, xpToNextLevel } from '../../src/logic/xp';

describe('xpToNextLevel', () => {
  it('starts at 5 orbs for level 1', () => {
    expect(xpToNextLevel(1)).toBe(5);
  });

  it('always grows with the level', () => {
    for (let level = 1; level < 60; level++) {
      expect(xpToNextLevel(level + 1)).toBeGreaterThan(xpToNextLevel(level));
    }
  });
});

describe('gainXp', () => {
  it('accumulates XP without levelling below the threshold', () => {
    expect(gainXp(INITIAL_XP, 4)).toEqual({ state: { level: 1, xp: 4 }, levelsGained: 0 });
  });

  it('levels up exactly at the threshold and resets the bar', () => {
    expect(gainXp(INITIAL_XP, 5)).toEqual({ state: { level: 2, xp: 0 }, levelsGained: 1 });
  });

  it('carries leftover XP over to the next level', () => {
    expect(gainXp(INITIAL_XP, 7).state).toEqual({ level: 2, xp: 2 });
  });

  it('can gain several levels from one big pickup', () => {
    const big = xpToNextLevel(1) + xpToNextLevel(2) + 1;
    expect(gainXp(INITIAL_XP, big)).toEqual({ state: { level: 3, xp: 1 }, levelsGained: 2 });
  });
});
