import { describe, expect, it } from 'vitest';
import { RUN_DURATION } from '../../src/config';
import {
  BOSS_LEAD, BOSSES, bossesDue, bossHpMultiplier, bossSpawnTime, MAPS, ZONE_DURATION, zoneChanged, zoneIndexAt,
} from '../../src/logic/maps';
import { ENEMIES, hpMultiplier } from '../../src/logic/waves';

const jak1 = MAPS.jak1;

describe('the Jak 1 map', () => {
  it('fills the whole run with its zones', () => {
    expect(jak1.zones.length * ZONE_DURATION).toBe(RUN_DURATION);
  });

  it('only uses enemies and bosses that exist', () => {
    for (const zone of jak1.zones) {
      expect(BOSSES[zone.boss]).toBeDefined();
      for (const entry of zone.pool) expect(ENEMIES[entry.enemy]).toBeDefined();
    }
  });

  it('has a different boss in every zone', () => {
    expect(new Set(jak1.zones.map((z) => z.boss)).size).toBe(jak1.zones.length);
  });

  it('can spawn something from the first second of every zone', () => {
    jak1.zones.forEach((zone, i) => {
      const zoneStart = i * ZONE_DURATION;
      expect(zone.pool.some((entry) => (entry.after ?? 0) <= zoneStart)).toBe(true);
    });
  });
});

describe('zoneIndexAt', () => {
  it.each([
    [0, 0], [149.9, 0], [150, 1], [299, 1], [300, 2], [450, 3], [599, 3],
  ])('at %ss is zone %s', (elapsed, zone) => {
    expect(zoneIndexAt(jak1, elapsed)).toBe(zone);
  });

  it('stays on the last zone in overtime', () => {
    expect(zoneIndexAt(jak1, 700)).toBe(3);
  });
});

describe('zoneChanged', () => {
  it('fires only on the step that crosses a zone boundary', () => {
    expect(zoneChanged(jak1, 149.99, 150.01)).toBe(true);
    expect(zoneChanged(jak1, 150.01, 150.03)).toBe(false);
    expect(zoneChanged(jak1, 0, 0.02)).toBe(false);
  });

  it('does not fire after the last zone', () => {
    expect(zoneChanged(jak1, 599.99, 600.01)).toBe(false);
  });
});

describe('boss schedule', () => {
  it('spawns each boss some seconds before its zone ends', () => {
    expect([0, 1, 2, 3].map(bossSpawnTime)).toEqual([120, 270, 420, 570]);
    expect(bossSpawnTime(0)).toBe(ZONE_DURATION - BOSS_LEAD);
  });

  it('reports a boss exactly once, on the step that reaches its time', () => {
    expect(bossesDue(jak1, 119.98, 120.01)).toEqual([0]);
    expect(bossesDue(jak1, 120.01, 120.03)).toEqual([]);
    expect(bossesDue(jak1, 0, 119.9)).toEqual([]);
  });

  it('scales boss HP more gently than regular enemies', () => {
    expect(bossHpMultiplier(120)).toBeCloseTo(1.8);
    expect(bossHpMultiplier(570)).toBeCloseTo(4.8);
    expect(bossHpMultiplier(570)).toBeLessThan(hpMultiplier(570));
  });

  it('reports every boss in a long step', () => {
    expect(bossesDue(jak1, 0, 600)).toEqual([0, 1, 2, 3]);
  });
});
