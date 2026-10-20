import { ITEMS, ownedOfKind, type Loadout, type WeaponId } from './items';
import type { Rng } from './rng';

/** The Morph Gun's four colours, as in Jak 3. Spin Kick and Yellow Eco are not guns and have none. */
export type GunColor = 'red' | 'yellow' | 'blue' | 'dark';

export const GUN_COLORS: Partial<Record<WeaponId, GunColor>> = {
  scatter: 'red', waveConcussor: 'red', plasmiteRpg: 'red',
  blaster: 'yellow', beamReflexor: 'yellow', gyroBurster: 'yellow',
  vulcan: 'blue', arc: 'blue', needleLazer: 'blue',
  peacemaker: 'dark', massInverter: 'dark', superNova: 'dark',
};

export const COLOR_NAMES: Record<GunColor, string> = { red: 'Red', yellow: 'Yellow', blue: 'Blue', dark: 'Dark' };
export const COLOR_HEX: Record<GunColor, string> = { red: '#e5383b', yellow: '#ffd166', blue: '#48cae4', dark: '#c77dff' };

/** Weapons that must be bought in the shop before they can show up in a run. */
export const SHOP_WEAPONS: WeaponId[] = [
  'waveConcussor', 'plasmiteRpg', 'beamReflexor', 'gyroBurster', 'needleLazer', 'massInverter', 'superNova',
];

/** Multipliers a weapon applies on top of the player's stats. `extra` adds projectiles, chains or bursts. */
export interface WeaponMods {
  damage: number;
  cooldown: number;
  area: number;
  extra: number;
}

export const NEUTRAL_MODS: WeaponMods = { damage: 1, cooldown: 1, area: 1, extra: 0 };

/** Colour synergy at 2 and 3 weapons of the same colour. */
export const SYNERGY: Record<GunColor, { description: [string, string]; apply(mods: WeaponMods, tier: 1 | 2): WeaponMods }> = {
  red: {
    description: ['+15% damage', '+30% damage'],
    apply: (m, tier) => ({ ...m, damage: m.damage * (1 + 0.15 * tier) }),
  },
  yellow: {
    description: ['-10% cooldown', '-20% cooldown'],
    apply: (m, tier) => ({ ...m, cooldown: m.cooldown * (1 - 0.1 * tier) }),
  },
  blue: {
    description: ['+1 projectile', '+2 projectiles'],
    apply: (m, tier) => ({ ...m, extra: m.extra + tier }),
  },
  dark: {
    description: ['+20% area', '+40% area'],
    apply: (m, tier) => ({ ...m, area: m.area * (1 + 0.2 * tier) }),
  },
};

export function colorCounts(loadout: Loadout): Record<GunColor, number> {
  const counts: Record<GunColor, number> = { red: 0, yellow: 0, blue: 0, dark: 0 };
  for (const id of ownedOfKind(loadout, 'weapon') as WeaponId[]) {
    const color = GUN_COLORS[id];
    if (color) counts[color]++;
  }
  return counts;
}

/** 0 = no synergy, 1 with two weapons of a colour, 2 with three or more. */
export function synergyTier(count: number): 0 | 1 | 2 {
  return count >= 3 ? 2 : count === 2 ? 1 : 0;
}

export type ModStat = 'damage' | 'cooldown' | 'area';

/** A chest upgrade for a whole colour or one weapon. Lasts for the run and stacks. */
export interface WeaponMod {
  target: { color: GunColor } | { weapon: WeaponId };
  stat: ModStat;
}

export const MOD_STEP: Record<ModStat, number> = { damage: 0.15, cooldown: 0.1, area: 0.15 };

function applyMod(mods: WeaponMods, stat: ModStat): WeaponMods {
  if (stat === 'cooldown') return { ...mods, cooldown: mods.cooldown * (1 - MOD_STEP.cooldown) };
  return { ...mods, [stat]: mods[stat] * (1 + MOD_STEP[stat]) };
}

/** Everything that changes one weapon: its colour synergy and every chest mod aimed at it or its colour. */
export function weaponModifiers(id: WeaponId, loadout: Loadout, chestMods: readonly WeaponMod[]): WeaponMods {
  const color = GUN_COLORS[id];
  let mods = NEUTRAL_MODS;
  if (color) {
    const tier = synergyTier(colorCounts(loadout)[color]);
    if (tier > 0) mods = SYNERGY[color].apply(mods, tier as 1 | 2);
  }
  for (const mod of chestMods) {
    const hits = 'weapon' in mod.target ? mod.target.weapon === id : mod.target.color === color;
    if (hits) mods = applyMod(mods, mod.stat);
  }
  return mods;
}

/** Half the time a colour you carry, otherwise one weapon you carry. Undefined with no weapons. */
export function rollWeaponMod(loadout: Loadout, rng: Rng): WeaponMod | undefined {
  const weapons = ownedOfKind(loadout, 'weapon') as WeaponId[];
  if (weapons.length === 0) return undefined;
  const colors = [...new Set(weapons.map((id) => GUN_COLORS[id]).filter((c): c is GunColor => !!c))];
  const stats: ModStat[] = ['damage', 'cooldown', 'area'];
  const stat = stats[Math.floor(rng() * stats.length)];
  if (colors.length > 0 && rng() < 0.5) return { target: { color: colors[Math.floor(rng() * colors.length)] }, stat };
  return { target: { weapon: weapons[Math.floor(rng() * weapons.length)] }, stat };
}

export function describeMod(mod: WeaponMod): string {
  const what = 'weapon' in mod.target ? ITEMS[mod.target.weapon].name : `${COLOR_NAMES[mod.target.color]} weapons`;
  const effect = mod.stat === 'damage' ? '+15% damage' : mod.stat === 'cooldown' ? '-10% cooldown' : '+15% area';
  return `${what}: ${effect}`;
}

/** Active synergies, for the HUD, e.g. "Red x2: +15% damage". */
export function activeSynergies(loadout: Loadout): string[] {
  const counts = colorCounts(loadout);
  return (Object.keys(counts) as GunColor[])
    .filter((color) => synergyTier(counts[color]) > 0)
    .map((color) => `${COLOR_NAMES[color]} x${counts[color]}: ${SYNERGY[color].description[synergyTier(counts[color]) - 1]}`);
}

/** Shop weapons the player hasn't bought yet: they never show up on level up. */
export function lockedWeapons(unlocked: readonly WeaponId[]): WeaponId[] {
  return SHOP_WEAPONS.filter((id) => !unlocked.includes(id));
}
