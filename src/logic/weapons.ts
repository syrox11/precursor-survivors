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

/**
 * Levels have no cap. Damage keeps growing linearly; cooldowns shrink by a percentage per level so they
 * never reach zero; counts (pellets, chains, needles...) and sizes grow up to a sensible maximum.
 */
const step = (level: number) => level - 1;
const grow = (base: number, perLevel: number, level: number, max = Infinity) => Math.min(max, base + perLevel * step(level));
const shrink = (base: number, rate: number, level: number) => base * Math.pow(rate, step(level));

const TABLE: { [K in WeaponId]: (level: number) => WeaponStatsMap[K] } = {
  spin: (l) => ({ cooldown: shrink(1.3, 0.93, l), damage: grow(12, 5, l), radius: grow(70, 12, l, 160) }),
  yellowEco: (l) => ({ cooldown: shrink(1.6, 0.94, l), damage: grow(12, 4, l), count: grow(1, 1, l, 8) }),
  scatter: (l) => ({ cooldown: shrink(1.5, 0.94, l), damage: grow(8, 3, l), pellets: grow(5, 1, l, 12), spread: 0.7 }),
  blaster: (l) => ({ cooldown: shrink(0.5, 0.92, l), damage: grow(10, 3, l), pierce: Math.min(6, Math.floor(step(l) / 2)) }),
  vulcan: (l) => ({ cooldown: shrink(2.4, 0.94, l), damage: grow(5, 1.5, l), burst: grow(6, 2, l, 24) }),
  peacemaker: (l) => ({ cooldown: shrink(3.4, 0.93, l), damage: grow(35, 15, l), radius: grow(75, 12, l, 200) }),
  arc: (l) => ({ cooldown: shrink(1.9, 0.94, l), damage: grow(11, 4, l), chains: grow(2, 1, l, 10), range: 130 }),
  waveConcussor: (l) => ({
    cooldown: shrink(3.2, 0.94, l), damage: grow(8, 3, l), radius: grow(380, 30, l, 600), stun: grow(0.6, 0.1, l, 1.6),
  }),
  plasmiteRpg: (l) => ({
    cooldown: shrink(2.8, 0.93, l), damage: grow(22, 8, l), radius: grow(70, 8, l, 150), burn: grow(6, 2, l), burnSeconds: grow(3, 0.5, l, 6),
  }),
  beamReflexor: (l) => ({ cooldown: shrink(0.75, 0.95, l), damage: grow(7, 2, l), bounces: grow(2, 1, l, 12) }),
  gyroBurster: (l) => ({
    cooldown: shrink(9, 0.94, l), damage: grow(5, 1.5, l), seconds: grow(3, 0.5, l, 8), fireEvery: Math.max(0.06, shrink(0.16, 0.93, l)),
  }),
  needleLazer: (l) => ({ cooldown: shrink(1.3, 0.94, l), damage: grow(5, 1.5, l), needles: grow(3, 1, l, 12) }),
  massInverter: (l) => ({
    cooldown: shrink(4.6, 0.93, l), damage: grow(10, 5, l), radius: grow(90, 10, l, 200), hpShare: grow(0.06, 0.01, l, 0.2),
  }),
  superNova: (l) => ({ cooldown: shrink(12, 0.92, l), damage: grow(60, 25, l), radius: grow(240, 20, l, 420) }),
};

export function weaponStats<K extends WeaponId>(id: K, level: number): WeaponStatsMap[K] {
  return TABLE[id](Math.max(1, Math.floor(level)));
}

/** Never let passives push a cooldown below this. */
export const MIN_COOLDOWN = 0.08;

export function effectiveCooldown(base: number, cooldownMultiplier: number): number {
  return Math.max(MIN_COOLDOWN, base * cooldownMultiplier);
}
