import type { UpgradeLevels } from './upgrades';

export interface PlayerStats {
  maxHp: number;
  /** Pixels per second. */
  moveSpeed: number;
  /** Distance at which orbs start flying towards the player. */
  pickupRadius: number;
  /** HP per second. */
  regen: number;
  damageMultiplier: number;
  spin: { radius: number; cooldown: number; damage: number };
  /** Null until yellow eco is picked. */
  blast: { count: number; cooldown: number; damage: number } | null;
}

export const BASE_HP = 100;
export const BASE_SPEED = 170;
export const BASE_PICKUP_RADIUS = 70;

export function computeStats(levels: UpgradeLevels): PlayerStats {
  const spin = levels.spin;
  const yellow = levels.yellowEco;
  return {
    maxHp: BASE_HP + 20 * levels.greenEco,
    moveSpeed: BASE_SPEED * (1 + 0.1 * levels.blueEco),
    pickupRadius: BASE_PICKUP_RADIUS * (1 + 0.35 * levels.blueEco),
    regen: 0.6 * levels.greenEco,
    damageMultiplier: 1 + 0.2 * levels.redEco,
    spin: {
      radius: 70 + 12 * (spin - 1),
      cooldown: 1.3 - 0.12 * (spin - 1),
      damage: 12 + 4 * (spin - 1),
    },
    blast: yellow > 0 ? { count: yellow, cooldown: 1.6 - 0.1 * yellow, damage: 10 + 3 * yellow } : null,
  };
}
