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
  waveConcussor: { cooldown: number; damage: number; radius: number; stun: number };
  plasmiteRpg: { cooldown: number; damage: number; radius: number; burn: number; burnSeconds: number };
  beamReflexor: { cooldown: number; damage: number; bounces: number };
  gyroBurster: { cooldown: number; damage: number; seconds: number; fireEvery: number };
  needleLazer: { cooldown: number; damage: number; needles: number };
  massInverter: { cooldown: number; damage: number; radius: number; hpShare: number };
  superNova: { cooldown: number; damage: number; radius: number };
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
  waveConcussor: (l) => ({ cooldown: 3.2 - 0.2 * step(l), damage: 8 + 3 * step(l), radius: 380 + 30 * step(l), stun: 0.6 + 0.1 * step(l) }),
  plasmiteRpg: (l) => ({
    cooldown: 2.8 - 0.2 * step(l), damage: 22 + 8 * step(l), radius: 70 + 8 * step(l), burn: 6 + 2 * step(l), burnSeconds: 3 + 0.5 * step(l),
  }),
  beamReflexor: (l) => ({ cooldown: 0.75 - 0.05 * step(l), damage: 7 + 2 * step(l), bounces: 1 + l }),
  gyroBurster: (l) => ({ cooldown: 9 - 0.5 * step(l), damage: 5 + 1.5 * step(l), seconds: 3 + 0.5 * step(l), fireEvery: 0.16 - 0.015 * step(l) }),
  needleLazer: (l) => ({ cooldown: 1.3 - 0.08 * step(l), damage: 5 + 1.5 * step(l), needles: 3 + step(l) }),
  massInverter: (l) => ({ cooldown: 4.6 - 0.3 * step(l), damage: 10 + 5 * step(l), radius: 90 + 10 * step(l), hpShare: 0.06 + 0.01 * step(l) }),
  superNova: (l) => ({ cooldown: 12 - 0.8 * step(l), damage: 60 + 25 * step(l), radius: 240 + 20 * step(l) }),
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
