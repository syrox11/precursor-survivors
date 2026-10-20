import { describe, expect, it } from 'vitest';
import { NEUTRAL_MODS } from '../../src/logic/arsenal';
import { describeItem, describeUpgrade, weaponBonus, type Bonus } from '../../src/logic/describe';
import { ITEMS, type ItemId } from '../../src/logic/items';
import { computeStats } from '../../src/logic/stats';

/** Red Eco 2 (+30% damage) and Tune-up 1 (-6% cooldown) on top of a red synergy (+15% damage). */
const bonus: Bonus = { damage: 1.3 * 1.15, cooldown: 0.94, area: 1, extra: 0 };

describe('describeUpgrade', () => {
  it('shows the summary and key numbers for a new weapon', () => {
    expect(describeUpgrade('blaster', 1)).toBe('Fast single shots at the nearest enemy.\nDamage 10\nEvery 0.50s');
  });

  it('shows exactly what changes on a level up, damage first', () => {
    expect(describeUpgrade('blaster', 3)).toBe('Damage 13 → 16\nEvery 0.46s → 0.42s\nPierces 0 enemies → 1 enemy');
  });

  it('adds the total with bonuses next to the base value', () => {
    expect(describeUpgrade('blaster', 3, bonus)).toBe('Damage 13 → 16 · total 24\nEvery 0.46s → 0.42s · total 0.40s\nPierces 0 enemies → 1 enemy');
    expect(describeUpgrade('scatter', 1, bonus)).toBe('A short-range shotgun cone where Jak faces.\nDamage 8 · total 12\nEvery 1.50s · total 1.41s');
  });

  it('leaves the total out when bonuses change nothing', () => {
    expect(describeUpgrade('blaster', 1, weaponBonus(computeStats({}), NEUTRAL_MODS))).toBe(describeUpgrade('blaster', 1));
  });

  it('counts extra projectiles from blue synergy in the total', () => {
    expect(describeItem('needleLazer', 1, { damage: 1, cooldown: 1, area: 1, extra: 2 })).toContain('Needles 3 · total 5');
  });

  it('shows passive totals before and after, in percent', () => {
    expect(describeUpgrade('redEco', 1)).toBe('More damage for every weapon.\nDamage +15%');
    expect(describeUpgrade('redEco', 3)).toBe('Damage +30% → +45%');
    expect(describeUpgrade('tuneUp', 2)).toBe('Cooldowns -6% → -12%');
  });

  it('never talks about Lurkers, since later maps have other enemies', () => {
    for (const id of Object.keys(ITEMS) as ItemId[]) {
      expect(describeUpgrade(id, 1)).not.toMatch(/lurker/i);
      expect(describeUpgrade(id, 4).length).toBeGreaterThan(0);
    }
  });
});

describe('describeItem', () => {
  it('lists every stat of an owned item at its level', () => {
    expect(describeItem('greenEco', 2)).toBe('More max health and health regeneration.\nMax health +40\nRegen 1 HP/s');
  });

  it('shows base and total for every stat that bonuses change', () => {
    expect(describeItem('peacemaker', 1, { damage: 2, cooldown: 0.5, area: 1.5, extra: 0 }))
      .toBe('A slow orb that explodes in a big area.\nDamage 35 · total 70\nEvery 3.40s · total 1.70s\nRadius 75 · total 113');
  });
});

describe('weaponBonus', () => {
  it('multiplies player stats with the weapon mods', () => {
    const stats = computeStats({ redEco: 2, tuneUp: 1, amplifier: 1 });
    expect(weaponBonus(stats, { damage: 1.15, cooldown: 0.9, area: 1.2, extra: 1 })).toEqual({
      damage: expect.closeTo(1.3 * 1.15), cooldown: expect.closeTo(0.94 * 0.9), area: expect.closeTo(1.1 * 1.2), extra: 1,
    });
  });
});
