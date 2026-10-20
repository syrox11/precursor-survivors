import { type Rng, shuffle } from './rng';

export type UpgradeId = 'spin' | 'redEco' | 'blueEco' | 'greenEco' | 'yellowEco';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  color: number;
  maxLevel: number;
  /** What the upgrade does when taken at `level` (1-based). */
  describe(level: number): string;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  spin: {
    id: 'spin',
    name: 'Spin Kick',
    color: 0x7fd8ff,
    maxLevel: 5,
    describe: () => 'Bigger area, faster and stronger spin',
  },
  redEco: {
    id: 'redEco',
    name: 'Red Eco',
    color: 0xe5383b,
    maxLevel: 5,
    describe: () => '+20% damage to every attack',
  },
  blueEco: {
    id: 'blueEco',
    name: 'Blue Eco',
    color: 0x3a86ff,
    maxLevel: 5,
    describe: () => '+10% speed, attracts orbs from further away',
  },
  greenEco: {
    id: 'greenEco',
    name: 'Green Eco',
    color: 0x38b000,
    maxLevel: 5,
    describe: () => '+20 max health and slow regeneration',
  },
  yellowEco: {
    id: 'yellowEco',
    name: 'Yellow Eco',
    color: 0xffd60a,
    maxLevel: 5,
    describe: (level) => (level === 1 ? 'Shoot eco blasts at nearby Lurkers' : 'One more blast, more damage'),
  },
};

export type UpgradeLevels = Record<UpgradeId, number>;

export const STARTING_LEVELS: UpgradeLevels = {
  spin: 1,
  redEco: 0,
  blueEco: 0,
  greenEco: 0,
  yellowEco: 0,
};

/** Up to `count` distinct upgrades that are not maxed out yet; empty when everything is maxed. */
export function rollChoices(levels: UpgradeLevels, rng: Rng, count = 3): UpgradeId[] {
  const available = (Object.keys(UPGRADES) as UpgradeId[]).filter((id) => levels[id] < UPGRADES[id].maxLevel);
  return shuffle(rng, available).slice(0, count);
}

export function applyUpgrade(levels: UpgradeLevels, id: UpgradeId): UpgradeLevels {
  if (levels[id] >= UPGRADES[id].maxLevel) return levels;
  return { ...levels, [id]: levels[id] + 1 };
}
