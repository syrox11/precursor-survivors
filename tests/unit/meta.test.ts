import { describe, expect, it } from 'vitest';
import { availableItems, rollChoices, startingLoadout } from '../../src/logic/items';
import { batteriesForRun, bonusesFor, NO_BONUSES } from '../../src/logic/meta';
import { createRng } from '../../src/logic/rng';
import { BASE_HP, computeStats, MAX_ARMOR } from '../../src/logic/stats';

describe('batteriesForRun', () => {
  it('gives nothing for a run that ends immediately', () => {
    expect(batteriesForRun({ won: false, time: 10, kills: 5, level: 1, bossesDefeated: 0 })).toBe(0);
  });
});

describe('bonusesFor', () => {
  it('is neutral with no power-ups and a stat-less companion', () => {
    expect(bonusesFor({}, 'clank')).toEqual(NO_BONUSES);
  });

  it('adds Daxter and Pecker bonuses on top of power-ups', () => {
    expect(bonusesFor({ swiftness: 2 }, 'daxter').speed).toBeCloseTo(0.18);
    expect(bonusesFor({ growth: 1 }, 'pecker').xp).toBeCloseTo(0.2);
  });

  it('feeds into player stats', () => {
    const stats = computeStats({}, bonusesFor({ vitality: 3, might: 2 }, 'clank'));
    expect(stats.maxHp).toBe(BASE_HP + 30);
    expect(stats.damageMultiplier).toBeCloseTo(1.1);
  });

  it('caps armor', () => {
    const stats = computeStats({ armor: 5 }, { ...NO_BONUSES, armor: 0.9 });
    expect(stats.armor).toBe(MAX_ARMOR);
  });
});

describe('bans', () => {
  it('never offers a banned item as a new pick', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(rollChoices({ spin: 1 }, createRng(seed), ['blaster', 'redEco'])).not.toContain('blaster');
    }
    expect(availableItems({ spin: 1 }, ['blaster'])).not.toContain('blaster');
  });

  it('still offers levels for an item you already own', () => {
    expect(availableItems({ blaster: 2 }, ['blaster'])).toContain('blaster');
  });
});

describe('startingLoadout', () => {
  it('starts with only the chosen weapon', () => {
    expect(startingLoadout('arc')).toEqual({ arc: 1 });
  });
});
