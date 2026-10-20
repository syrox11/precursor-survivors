import { describe, expect, it } from 'vitest';
import { MAPS, type MapId } from '../../src/logic/maps';
import { describeGift, gambleGift, MAP_NPCS, NPCS, pickNpcs } from '../../src/logic/npcs';
import { createRng } from '../../src/logic/rng';

const maps = Object.keys(MAPS) as MapId[];

describe('map casts', () => {
  it.each(maps)('%s has enough distinct characters for every zone', (map) => {
    expect(new Set(MAP_NPCS[map]).size).toBe(MAP_NPCS[map].length);
    expect(MAP_NPCS[map].length).toBeGreaterThanOrEqual(MAPS[map].zones.length);
  });

  it('matches the cast asked for each game', () => {
    expect(MAP_NPCS.jak1).toEqual(['samos', 'blueSage', 'redSage', 'yellowSage', 'keira', 'mayor', 'gambler', 'miners']);
    expect(MAP_NPCS.jak2).toContain('vin');
    expect(MAP_NPCS.jak3).toContain('precursors');
  });
});

describe('pickNpcs', () => {
  it('picks distinct characters from the map cast only', () => {
    for (let seed = 0; seed < 30; seed++) {
      const picked = pickNpcs('jak2', createRng(seed), 4);
      expect(new Set(picked).size).toBe(4);
      for (const id of picked) expect(MAP_NPCS.jak2).toContain(id);
    }
  });

  it('is deterministic for a seed', () => {
    expect(pickNpcs('jak1', createRng(3), 4)).toEqual(pickNpcs('jak1', createRng(3), 4));
  });
});

describe('gambleGift', () => {
  it('never returns another gamble and only gifts from that map', () => {
    const jak1Gifts = MAP_NPCS.jak1.map((id) => NPCS[id].gift);
    const rng = createRng(9);
    for (let i = 0; i < 100; i++) {
      const gift = gambleGift('jak1', rng);
      expect(gift.kind).not.toBe('random');
      expect(jak1Gifts).toContainEqual(gift);
    }
  });
});

describe('describeGift', () => {
  it('has a label for every character gift', () => {
    for (const npc of Object.values(NPCS)) expect(describeGift(npc.gift).length).toBeGreaterThan(0);
  });

  it('formats the numbers', () => {
    expect(describeGift({ kind: 'damageBuff', multiplier: 1.5, seconds: 30 })).toBe('+50% damage for 30s');
    expect(describeGift({ kind: 'levels', amount: 2, heal: true })).toBe('+2 levels and a full heal');
  });
});
