import { type Rng, shuffle } from './rng';

export type WeaponId =
  | 'spin' | 'yellowEco' | 'scatter' | 'blaster' | 'vulcan' | 'peacemaker' | 'arc'
  // Jak 3 Morph Gun mods, unlocked in the shop
  | 'waveConcussor' | 'plasmiteRpg' | 'beamReflexor' | 'gyroBurster' | 'needleLazer' | 'massInverter' | 'superNova';
export type PassiveId = 'redEco' | 'blueEco' | 'greenEco' | 'armor' | 'amplifier' | 'tuneUp';
export type ItemId = WeaponId | PassiveId;
export type ItemKind = 'weapon' | 'passive';

export interface ItemDef {
  id: ItemId;
  kind: ItemKind;
  name: string;
  color: number;
  maxLevel: number;
  /** What the item does when taken at `level` (1 = new). */
  describe(level: number): string;
}

const weapon = (id: WeaponId, name: string, color: number, first: string, next: string): ItemDef => ({
  id, kind: 'weapon', name, color, maxLevel: 5, describe: (level) => (level === 1 ? first : next),
});

const passive = (id: PassiveId, name: string, color: number, text: string): ItemDef => ({
  id, kind: 'passive', name, color, maxLevel: 5, describe: () => text,
});

export const ITEMS: Record<ItemId, ItemDef> = {
  spin: weapon('spin', 'Spin Kick', 0x7fd8ff, 'Spin attack around Jak', 'Bigger, faster and stronger spin'),
  yellowEco: weapon('yellowEco', 'Yellow Eco', 0xffd60a, 'Eco blasts at the closest Lurkers', 'One more blast, more damage'),
  scatter: weapon('scatter', 'Scatter Gun', 0xe5383b, 'Short-range shotgun cone where you face', 'More pellets, more damage'),
  blaster: weapon('blaster', 'Blaster', 0xffa62b, 'Rapid shots at the closest Lurker', 'Faster fire; pierces from level 4'),
  vulcan: weapon('vulcan', 'Vulcan Fury', 0x4cc9f0, 'Bullet bursts where you face', 'Longer bursts, more damage'),
  peacemaker: weapon('peacemaker', 'Peacemaker', 0x9d4edd, 'Slow orb that explodes in a big area', 'Bigger blast, more damage'),
  arc: weapon('arc', 'Arc Wielder', 0x90e0ef, 'Lightning that chains between Lurkers', 'Chains to one more Lurker'),
  waveConcussor: weapon('waveConcussor', 'Wave Concussor', 0xff6b6b, 'A shockwave across the screen that pushes back and stuns', 'Wider wave, longer stun'),
  plasmiteRpg: weapon('plasmiteRpg', 'Plasmite RPG', 0xc1121f, 'Rockets at the thickest crowd that leave burning plasma', 'More damage, longer burn'),
  beamReflexor: weapon('beamReflexor', 'Beam Reflexor', 0xffd166, 'Shots that bounce from Lurker to Lurker', 'One more bounce'),
  gyroBurster: weapon('gyroBurster', 'Gyro Burster', 0xf4a261, 'A spinning decoy that sprays shots and draws Lurkers in', 'Lasts longer, fires faster'),
  needleLazer: weapon('needleLazer', 'Needle Lazer', 0x48cae4, 'Swarms of homing needles', 'More needles, more damage'),
  massInverter: weapon('massInverter', 'Mass Inverter', 0x7b2cbf, 'Lifts Lurkers off the ground, then slams them down', 'Bigger field, harder slam'),
  superNova: weapon('superNova', 'Super Nova', 0x3c096c, 'A slow-charging nova that blasts everything around Jak', 'Bigger, stronger, more often'),

  redEco: passive('redEco', 'Red Eco', 0xd62828, '+15% damage'),
  blueEco: passive('blueEco', 'Blue Eco', 0x3a86ff, '+8% speed, attracts orbs from further away'),
  greenEco: passive('greenEco', 'Green Eco', 0x38b000, '+20 max health, regenerate health'),
  armor: passive('armor', 'Precursor Armor', 0xc9a227, '-6% damage taken'),
  amplifier: passive('amplifier', 'Eco Amplifier', 0x80ffdb, '+10% attack area'),
  tuneUp: passive('tuneUp', "Keira's Tune-up", 0xff70a6, '-6% weapon cooldowns'),
};

/** Item -> level. Missing means not owned. Key order is pick order, which the HUD shows. */
export type Loadout = Partial<Record<ItemId, number>>;

export const STARTING_LOADOUT: Loadout = { spin: 1 };

export function startingLoadout(weapon: WeaponId): Loadout {
  return { [weapon]: 1 };
}

export const SLOTS: Record<ItemKind, number> = { weapon: 5, passive: 4 };

export function levelOf(loadout: Loadout, id: ItemId): number {
  return loadout[id] ?? 0;
}

export function ownedOfKind(loadout: Loadout, kind: ItemKind): ItemId[] {
  return (Object.keys(loadout) as ItemId[]).filter((id) => ITEMS[id].kind === kind);
}

/**
 * Items that can still be offered: owned ones not maxed, plus new ones while that kind has free slots.
 * Banned items are never offered as new picks.
 */
export function availableItems(loadout: Loadout, banned: readonly ItemId[] = []): ItemId[] {
  return (Object.keys(ITEMS) as ItemId[]).filter((id) => {
    const def = ITEMS[id];
    const level = levelOf(loadout, id);
    if (level > 0) return level < def.maxLevel;
    return !banned.includes(id) && ownedOfKind(loadout, def.kind).length < SLOTS[def.kind];
  });
}

/** Up to `count` distinct offers; empty when everything is maxed and every slot is full. */
export function rollChoices(loadout: Loadout, rng: Rng, banned: readonly ItemId[] = [], count = 3): ItemId[] {
  return shuffle(rng, availableItems(loadout, banned)).slice(0, count);
}

export function applyItem(loadout: Loadout, id: ItemId): Loadout {
  if (!availableItems(loadout).includes(id)) return loadout;
  return { ...loadout, [id]: levelOf(loadout, id) + 1 };
}
