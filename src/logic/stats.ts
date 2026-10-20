import { levelOf, type Loadout } from './items';
import { NO_BONUSES, type Bonuses } from './meta';

/** Player stats from passive items plus permanent bonuses. Weapons read the multipliers when they fire. */
export interface PlayerStats {
  maxHp: number;
  /** Pixels per second. */
  moveSpeed: number;
  /** Distance at which orbs start flying towards the player. */
  pickupRadius: number;
  /** HP per second. */
  regen: number;
  damageMultiplier: number;
  /** Fraction of incoming damage that is blocked, 0 to MAX_ARMOR. */
  armor: number;
  areaMultiplier: number;
  cooldownMultiplier: number;
  xpMultiplier: number;
}

export const BASE_HP = 100;
export const BASE_SPEED = 170;
export const BASE_PICKUP_RADIUS = 70;
export const MAX_ARMOR = 0.6;

export function computeStats(loadout: Loadout, bonuses: Bonuses = NO_BONUSES): PlayerStats {
  const level = (id: Parameters<typeof levelOf>[1]) => levelOf(loadout, id);
  return {
    maxHp: BASE_HP + bonuses.maxHp + 20 * level('greenEco'),
    moveSpeed: BASE_SPEED * (1 + bonuses.speed + 0.08 * level('blueEco')),
    pickupRadius: BASE_PICKUP_RADIUS * (1 + bonuses.pickup + 0.35 * level('blueEco')),
    regen: 0.5 * level('greenEco'),
    damageMultiplier: 1 + bonuses.damage + 0.15 * level('redEco'),
    armor: Math.min(MAX_ARMOR, bonuses.armor + 0.06 * level('armor')),
    areaMultiplier: 1 + 0.1 * level('amplifier'),
    cooldownMultiplier: 1 - 0.06 * level('tuneUp'),
    xpMultiplier: 1 + bonuses.xp,
  };
}
