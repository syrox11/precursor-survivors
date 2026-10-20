import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/logic/rng';
import { BASE_HP, BASE_SPEED, computeStats } from '../../src/logic/stats';
import { applyUpgrade, rollChoices, STARTING_LEVELS, UPGRADES, type UpgradeLevels } from '../../src/logic/upgrades';

const maxed = (except: Partial<UpgradeLevels> = {}): UpgradeLevels => ({
  spin: 5, redEco: 5, blueEco: 5, greenEco: 5, yellowEco: 5, ...except,
});

describe('rollChoices', () => {
  it('offers 3 distinct upgrades', () => {
    const choices = rollChoices(STARTING_LEVELS, createRng(1));
    expect(choices).toHaveLength(3);
    expect(new Set(choices).size).toBe(3);
  });

  it('is deterministic for a given seed', () => {
    expect(rollChoices(STARTING_LEVELS, createRng(9))).toEqual(rollChoices(STARTING_LEVELS, createRng(9)));
  });

  it('never offers a maxed upgrade', () => {
    const levels = maxed({ redEco: 2, blueEco: 0 });
    for (let seed = 0; seed < 50; seed++) {
      expect(rollChoices(levels, createRng(seed)).sort()).toEqual(['blueEco', 'redEco']);
    }
  });

  it('returns nothing when everything is maxed', () => {
    expect(rollChoices(maxed(), createRng(1))).toEqual([]);
  });
});

describe('applyUpgrade', () => {
  it('raises one level without mutating the input', () => {
    const next = applyUpgrade(STARTING_LEVELS, 'redEco');
    expect(next.redEco).toBe(1);
    expect(STARTING_LEVELS.redEco).toBe(0);
  });

  it('does not go past the max level', () => {
    expect(applyUpgrade(maxed(), 'spin').spin).toBe(UPGRADES.spin.maxLevel);
  });
});

describe('computeStats', () => {
  it('starts with base stats, the spin attack and no eco blast', () => {
    const stats = computeStats(STARTING_LEVELS);
    expect(stats.maxHp).toBe(BASE_HP);
    expect(stats.moveSpeed).toBe(BASE_SPEED);
    expect(stats.damageMultiplier).toBe(1);
    expect(stats.blast).toBeNull();
  });

  it('applies each eco to its own stat', () => {
    const stats = computeStats({ ...STARTING_LEVELS, redEco: 2, blueEco: 1, greenEco: 3, yellowEco: 2 });
    expect(stats.damageMultiplier).toBeCloseTo(1.4);
    expect(stats.moveSpeed).toBeCloseTo(BASE_SPEED * 1.1);
    expect(stats.maxHp).toBe(BASE_HP + 60);
    expect(stats.blast?.count).toBe(2);
  });

  it('keeps cooldowns positive at max level', () => {
    const stats = computeStats(maxed());
    expect(stats.spin.cooldown).toBeGreaterThan(0);
    expect(stats.blast!.cooldown).toBeGreaterThan(0);
  });
});
