import { describe, expect, it } from 'vitest';
import { describeItem, describeUpgrade } from '../../src/logic/describe';
import { ITEMS, type ItemId } from '../../src/logic/items';

describe('describeUpgrade', () => {
  it('shows the summary and key numbers for a new weapon', () => {
    expect(describeUpgrade('blaster', 1)).toBe('Fast single shots at the nearest enemy.\nDamage 10 · Every 0.50s');
  });

  it('shows exactly what changes on a level up, damage first', () => {
    expect(describeUpgrade('blaster', 3)).toBe('Damage 13 → 16\nEvery 0.46s → 0.42s\nPierces 0 enemies → 1 enemy');
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
});
