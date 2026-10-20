import { describe, expect, it } from 'vitest';
import {
  activeSynergies, colorCounts, describeMod, GUN_COLORS, lockedWeapons, NEUTRAL_MODS, rollWeaponMod, SHOP_WEAPONS,
  synergyTier, weaponModifiers, type WeaponMod,
} from '../../src/logic/arsenal';
import { ITEMS, type WeaponId } from '../../src/logic/items';
import { createRng } from '../../src/logic/rng';

describe('gun colours', () => {
  it('puts three Morph Gun weapons in each colour', () => {
    const byColor = Object.values(GUN_COLORS).reduce<Record<string, number>>((acc, c) => ({ ...acc, [c!]: (acc[c!] ?? 0) + 1 }), {});
    expect(byColor).toEqual({ red: 3, yellow: 3, blue: 3, dark: 3 });
  });

  it('leaves Spin Kick and Yellow Eco without a colour', () => {
    expect(GUN_COLORS.spin).toBeUndefined();
    expect(GUN_COLORS.yellowEco).toBeUndefined();
  });

  it('only colours weapons that exist', () => {
    for (const id of Object.keys(GUN_COLORS)) expect(ITEMS[id as WeaponId].kind).toBe('weapon');
  });
});

describe('synergy', () => {
  it('counts weapons by colour and ignores passives', () => {
    expect(colorCounts({ scatter: 1, plasmiteRpg: 2, arc: 1, redEco: 3, spin: 1 })).toEqual({ red: 2, yellow: 0, blue: 1, dark: 0 });
  });

  it('kicks in at two weapons and grows at three', () => {
    expect([1, 2, 3, 4].map(synergyTier)).toEqual([0, 1, 2, 2]);
  });

  it('applies the colour bonus to that colour only', () => {
    const loadout = { scatter: 1, waveConcussor: 1, blaster: 1 };
    expect(weaponModifiers('scatter', loadout, []).damage).toBeCloseTo(1.15);
    expect(weaponModifiers('blaster', loadout, [])).toEqual(NEUTRAL_MODS);
  });

  it('gives each colour its own kind of bonus', () => {
    const three = (a: WeaponId, b: WeaponId, c: WeaponId) => weaponModifiers(a, { [a]: 1, [b]: 1, [c]: 1 }, []);
    expect(three('scatter', 'waveConcussor', 'plasmiteRpg').damage).toBeCloseTo(1.3);
    expect(three('blaster', 'beamReflexor', 'gyroBurster').cooldown).toBeCloseTo(0.8);
    expect(three('vulcan', 'arc', 'needleLazer').extra).toBe(2);
    expect(three('peacemaker', 'massInverter', 'superNova').area).toBeCloseTo(1.4);
  });

  it('lists the active synergies for the HUD', () => {
    expect(activeSynergies({ vulcan: 1, arc: 1, scatter: 1 })).toEqual(['Blue x2: +1 projectile']);
  });
});

describe('chest weapon mods', () => {
  const redDamage: WeaponMod = { target: { color: 'red' }, stat: 'damage' };
  const blasterSpeed: WeaponMod = { target: { weapon: 'blaster' }, stat: 'cooldown' };

  it('hit a whole colour, or one weapon', () => {
    const loadout = { scatter: 1, blaster: 1 };
    expect(weaponModifiers('scatter', loadout, [redDamage]).damage).toBeCloseTo(1.15);
    expect(weaponModifiers('blaster', loadout, [redDamage])).toEqual(NEUTRAL_MODS);
    expect(weaponModifiers('blaster', loadout, [blasterSpeed]).cooldown).toBeCloseTo(0.9);
  });

  it('stack with each other and with synergy', () => {
    const loadout = { scatter: 1, plasmiteRpg: 1 };
    expect(weaponModifiers('scatter', loadout, [redDamage, redDamage]).damage).toBeCloseTo(1.15 * 1.15 * 1.15);
  });

  it('only roll for colours and weapons you carry', () => {
    const rng = createRng(3);
    for (let i = 0; i < 100; i++) {
      const mod = rollWeaponMod({ blaster: 2, spin: 1 }, rng)!;
      if ('color' in mod.target) expect(mod.target.color).toBe('yellow');
      else expect(['blaster', 'spin']).toContain(mod.target.weapon);
    }
    expect(rollWeaponMod({ redEco: 1 }, rng)).toBeUndefined();
  });

  it('describe themselves', () => {
    expect(describeMod(redDamage)).toBe('Red weapons: +15% damage');
    expect(describeMod(blasterSpeed)).toBe('Blaster: -10% cooldown');
  });
});

describe('lockedWeapons', () => {
  it('locks every shop weapon until bought', () => {
    expect(lockedWeapons(['spin'])).toEqual(SHOP_WEAPONS);
    expect(lockedWeapons(['spin', 'needleLazer'])).not.toContain('needleLazer');
  });
});
