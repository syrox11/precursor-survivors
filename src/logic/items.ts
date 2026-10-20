import { type Rng, shuffle } from './rng';

export type WeaponId = 'spin' | 'yellowEco' | 'scatter' | 'blaster' | 'vulcan' | 'peacemaker' | 'arc';
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

export const SLOTS: Record<ItemKind, number> = { weapon: 4, passive: 4 };

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
