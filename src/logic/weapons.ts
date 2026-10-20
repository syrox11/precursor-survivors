import type { WeaponId } from './items';

/**
 * Base numbers per weapon level (1-5), before passives.
 * Cooldowns in seconds, speeds in px/s, lifetimes in seconds, angles in radians.
 */
export interface WeaponStatsMap {
  spin: { cooldown: number; damage: number; radius: number };
  yellowEco: { cooldown: number; damage: number; count: number };
  scatter: { cooldown: number; damage: number; pellets: number; spread: number };
  blaster: { cooldown: number; damage: number; pierce: number };
  vulcan: { cooldown: number; damage: number; burst: number };
  peacemaker: { cooldown: number; damage: number; radius: number };
  arc: { cooldown: number; damage: number; chains: number; range: number };
}

const step = (level: number) => level - 1;

const TABLE: { [K in WeaponId]: (level: number) => WeaponStatsMap[K] } = {
  spin: (l) => ({ cooldown: 1.3 - 0.1 * step(l), damage: 12 + 5 * step(l), radius: 70 + 12 * step(l) }),
  yellowEco: (l) => ({ cooldown: 1.6 - 0.1 * step(l), damage: 12 + 4 * step(l), count: l }),
  scatter: (l) => ({ cooldown: 1.5 - 0.1 * step(l), damage: 8 + 3 * step(l), pellets: 5 + step(l), spread: 0.7 }),
  blaster: (l) => ({ cooldown: 0.5 - 0.06 * step(l), damage: 10 + 3 * step(l), pierce: l >= 4 ? 2 : 0 }),
  vulcan: (l) => ({ cooldown: 2.4 - 0.15 * step(l), damage: 5 + 1.5 * step(l), burst: 6 + 2 * step(l) }),
  peacemaker: (l) => ({ cooldown: 3.4 - 0.25 * step(l), damage: 35 + 15 * step(l), radius: 75 + 12 * step(l) }),
  arc: (l) => ({ cooldown: 1.9 - 0.12 * step(l), damage: 11 + 4 * step(l), chains: 2 + step(l), range: 130 }),
};

export function weaponStats<K extends WeaponId>(id: K, level: number): WeaponStatsMap[K] {
  const clamped = Math.min(5, Math.max(1, level));
  return TABLE[id](clamped);
}

/** Never let passives push a cooldown below this. */
export const MIN_COOLDOWN = 0.08;

export function effectiveCooldown(base: number, cooldownMultiplier: number): number {
  return Math.max(MIN_COOLDOWN, base * cooldownMultiplier);
}
