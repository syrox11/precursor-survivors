import { describe, expect, it } from 'vitest';
import { ZONE_DURATION } from '../../src/logic/maps';
import {
  CHEST_EVERY, CHEST_WEIGHTS, chestDue, crossed, ENEMY_DROP_CHANCE, FIRST_CHEST, NPC_AT, rollChest, rollEnemyDrop, zoneEventDue,
  type ChestContent,
} from '../../src/logic/pickups';
import { createRng } from '../../src/logic/rng';

describe('rollChest', () => {
  it('gives every kind of content, roughly by weight', () => {
    const rng = createRng(4);
    const counts = Object.fromEntries(Object.keys(CHEST_WEIGHTS).map((k) => [k, 0])) as Record<ChestContent, number>;
    for (let i = 0; i < 6000; i++) counts[rollChest(rng)]++;
    const total = Object.values(CHEST_WEIGHTS).reduce((a, b) => a + b, 0);
    for (const [content, weight] of Object.entries(CHEST_WEIGHTS) as [ChestContent, number][]) {
      expect(counts[content] / 6000).toBeCloseTo(weight / total, 1);
    }
  });
});

describe('crossed', () => {
  it('includes the end of the step and excludes the start', () => {
    expect(crossed(10, 9.99, 10)).toBe(true);
    expect(crossed(10, 10, 10.02)).toBe(false);
  });
});

describe('chestDue', () => {
  it('drops the first chest at its time, then on a fixed rhythm', () => {
    expect(chestDue(0, FIRST_CHEST - 0.1)).toBe(false);
    expect(chestDue(FIRST_CHEST - 0.01, FIRST_CHEST + 0.01)).toBe(true);
    expect(chestDue(FIRST_CHEST + 0.01, FIRST_CHEST + 0.03)).toBe(false);
    const second = FIRST_CHEST + CHEST_EVERY;
    expect(chestDue(second - 0.01, second + 0.01)).toBe(true);
  });
});

describe('zoneEventDue', () => {
  it('fires once per zone at the given offset', () => {
    expect(zoneEventDue(NPC_AT, 4, NPC_AT - 0.01, NPC_AT + 0.01)).toBe(0);
    const third = 2 * ZONE_DURATION + NPC_AT;
    expect(zoneEventDue(NPC_AT, 4, third - 0.01, third + 0.01)).toBe(2);
    expect(zoneEventDue(NPC_AT, 4, NPC_AT + 0.01, NPC_AT + 0.03)).toBeUndefined();
  });

  it('ignores zones past the last one', () => {
    const fifth = 4 * ZONE_DURATION + NPC_AT;
    expect(zoneEventDue(NPC_AT, 4, fifth - 0.01, fifth + 0.01)).toBeUndefined();
  });
});

describe('rollEnemyDrop', () => {
  it('drops rarely and never a weapon mod', () => {
    const rng = createRng(8);
    let drops = 0;
    for (let i = 0; i < 50000; i++) {
      const drop = rollEnemyDrop(rng);
      if (!drop) continue;
      drops++;
      expect(drop).not.toBe('weaponMod');
    }
    expect(drops / 50000).toBeCloseTo(ENEMY_DROP_CHANCE, 2);
  });
});
