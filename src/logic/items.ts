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
  /** Levels have no cap; stats are shaped so they stay sane however high they go. */
  maxLevel: number;
  /** One sentence on what the item is for. The numbers come from `describeUpgrade` / `describeItem`. */
  summary: string;
}

const weapon = (id: WeaponId, name: string, color: number, summary: string): ItemDef => ({
  id, kind: 'weapon', name, color, maxLevel: Infinity, summary,
});

const passive = (id: PassiveId, name: string, color: number, summary: string): ItemDef => ({
  id, kind: 'passive', name, color, maxLevel: Infinity, summary,
});

export const ITEMS: Record<ItemId, ItemDef> = {
  spin: weapon('spin', 'Spin Kick', 0x7fd8ff, 'Jak spins and kicks every enemy around him.'),
  yellowEco: weapon('yellowEco', 'Yellow Eco', 0xffd60a, 'Eco blasts at the nearest enemies.'),
  scatter: weapon('scatter', 'Scatter Gun', 0xe5383b, 'A short-range shotgun cone where Jak faces.'),
  blaster: weapon('blaster', 'Blaster', 0xffa62b, 'Fast single shots at the nearest enemy.'),
  vulcan: weapon('vulcan', 'Vulcan Fury', 0x4cc9f0, 'Bursts of bullets where Jak faces.'),
  peacemaker: weapon('peacemaker', 'Peacemaker', 0x9d4edd, 'A slow orb that explodes in a big area.'),
  arc: weapon('arc', 'Arc Wielder', 0x90e0ef, 'Lightning that jumps from enemy to enemy.'),
  waveConcussor: weapon('waveConcussor', 'Wave Concussor', 0xff6b6b, 'A shockwave across the screen that pushes enemies back and stuns them.'),
  plasmiteRpg: weapon('plasmiteRpg', 'Plasmite RPG', 0xc1121f, 'Rockets at the thickest crowd that leave burning plasma on the ground.'),
  beamReflexor: weapon('beamReflexor', 'Beam Reflexor', 0xffd166, 'Shots that bounce from enemy to enemy.'),
  gyroBurster: weapon('gyroBurster', 'Gyro Burster', 0xf4a261, 'A spinning decoy that sprays shots and pulls nearby enemies in.'),
  needleLazer: weapon('needleLazer', 'Needle Lazer', 0x48cae4, 'Swarms of homing needles that chase enemies.'),
  massInverter: weapon('massInverter', 'Mass Inverter', 0x7b2cbf, 'Lifts enemies off the ground, then slams them for a share of their health.'),
  superNova: weapon('superNova', 'Super Nova', 0x3c096c, 'Charges, then blasts everything around Jak.'),

  redEco: passive('redEco', 'Red Eco', 0xd62828, 'More damage for every weapon.'),
  blueEco: passive('blueEco', 'Blue Eco', 0x3a86ff, 'Faster movement and a bigger orb pickup range.'),
  greenEco: passive('greenEco', 'Green Eco', 0x38b000, 'More max health and health regeneration.'),
  armor: passive('armor', 'Precursor Armor', 0xc9a227, 'Less damage taken.'),
  amplifier: passive('amplifier', 'Eco Amplifier', 0x80ffdb, 'Bigger attack areas.'),
  tuneUp: passive('tuneUp', "Keira's Tune-up", 0xff70a6, 'Shorter cooldowns for every weapon.'),
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
