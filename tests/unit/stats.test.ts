import { describe, expect, it } from 'vitest';
import { STARTING_LOADOUT, type WeaponId } from '../../src/logic/items';
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
    expect(stats.cooldownMultiplier).toBeCloseTo(0.7);
  });

  it('ignores weapons', () => {
    expect(computeStats({ spin: 5, arc: 3 })).toEqual(computeStats({}));
  });
});

describe('weaponStats', () => {
  const weapons: WeaponId[] = ['spin', 'yellowEco', 'scatter', 'blaster', 'vulcan', 'peacemaker', 'arc'];

  it.each(weapons)('%s gets stronger and never slower with each level', (id) => {
    for (let level = 1; level < 5; level++) {
      const now = weaponStats(id, level);
      const next = weaponStats(id, level + 1);
      expect(next.damage).toBeGreaterThan(now.damage);
      expect(next.cooldown).toBeLessThanOrEqual(now.cooldown);
    }
  });

  it.each(weapons)('%s keeps a positive cooldown at max level', (id) => {
    expect(weaponStats(id, 5).cooldown).toBeGreaterThan(0);
  });

  it('clamps levels outside 1-5', () => {
    expect(weaponStats('arc', 9)).toEqual(weaponStats('arc', 5));
    expect(weaponStats('arc', 0)).toEqual(weaponStats('arc', 1));
  });

  it('only gives the Blaster piercing from level 4', () => {
    expect(weaponStats('blaster', 3).pierce).toBe(0);
    expect(weaponStats('blaster', 4).pierce).toBeGreaterThan(0);
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
