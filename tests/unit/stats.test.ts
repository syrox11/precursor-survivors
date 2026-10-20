import { describe, expect, it } from 'vitest';
import { ITEMS, STARTING_LOADOUT, type WeaponId } from '../../src/logic/items';
import { BASE_HP, BASE_SPEED, computeStats } from '../../src/logic/stats';
import { effectiveCooldown, MIN_COOLDOWN, weaponStats } from '../../src/logic/weapons';

describe('computeStats', () => {
  it('starts with base stats and neutral multipliers', () => {
    const stats = computeStats(STARTING_LOADOUT);
    expect(stats.maxHp).toBe(BASE_HP);
    expect(stats.moveSpeed).toBe(BASE_SPEED);
    expect(stats.damageMultiplier).toBe(1);
    expect(stats.armor).toBe(0);
    expect(stats.areaMultiplier).toBe(1);
    expect(stats.cooldownMultiplier).toBe(1);
  });

  it('applies each passive to its own stat', () => {
    const stats = computeStats({ redEco: 2, blueEco: 1, greenEco: 3, armor: 5, amplifier: 2, tuneUp: 5 });
    expect(stats.damageMultiplier).toBeCloseTo(1.3);
    expect(stats.moveSpeed).toBeCloseTo(BASE_SPEED * 1.08);
    expect(stats.maxHp).toBe(BASE_HP + 60);
    expect(stats.armor).toBeCloseTo(0.3);
    expect(stats.areaMultiplier).toBeCloseTo(1.2);
    expect(stats.cooldownMultiplier).toBeCloseTo(Math.pow(0.94, 5));
  });

  it('stays sane at very high passive levels', () => {
    const stats = computeStats({ blueEco: 50, tuneUp: 50, armor: 50 });
    expect(stats.moveSpeed).toBeLessThan(BASE_SPEED * 1.8);
    expect(stats.cooldownMultiplier).toBeGreaterThan(0);
    expect(stats.armor).toBe(0.6);
  });

  it('ignores weapons', () => {
    expect(computeStats({ spin: 5, arc: 3 })).toEqual(computeStats({}));
  });
});

describe('weaponStats', () => {
  const weapons = Object.keys(ITEMS).filter((id) => ITEMS[id as WeaponId].kind === 'weapon') as WeaponId[];

  it.each(weapons)('%s gets stronger and never slower with each level', (id) => {
    for (let level = 1; level < 30; level++) {
      const now = weaponStats(id, level);
      const next = weaponStats(id, level + 1);
      expect(next.damage).toBeGreaterThan(now.damage);
      expect(next.cooldown).toBeLessThanOrEqual(now.cooldown);
    }
  });

  it.each(weapons)('%s keeps a positive cooldown even at level 100', (id) => {
    expect(weaponStats(id, 100).cooldown).toBeGreaterThan(0);
  });

  it('has no level cap, and treats levels below 1 as 1', () => {
    expect(weaponStats('arc', 9).damage).toBeGreaterThan(weaponStats('arc', 5).damage);
    expect(weaponStats('arc', 0)).toEqual(weaponStats('arc', 1));
  });

  it('caps counts and sizes so very high levels stay playable', () => {
    expect(weaponStats('scatter', 100).pellets).toBe(12);
    expect(weaponStats('spin', 100).radius).toBe(160);
  });

  it('gives the Blaster one more pierce every two levels', () => {
    expect([1, 2, 3, 4, 5].map((l) => weaponStats('blaster', l).pierce)).toEqual([0, 0, 1, 1, 2]);
  });
});

describe('effectiveCooldown', () => {
  it('applies the multiplier', () => {
    expect(effectiveCooldown(2, 0.7)).toBeCloseTo(1.4);
  });

  it('never goes below the minimum', () => {
    expect(effectiveCooldown(0.1, 0.1)).toBe(MIN_COOLDOWN);
  });
});
