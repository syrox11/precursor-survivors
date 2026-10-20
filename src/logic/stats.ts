import { levelOf, type Loadout } from './items';

/** Player stats from passive items. Weapons read the multipliers when they fire. */
export interface PlayerStats {
  maxHp: number;
  /** Pixels per second. */
  moveSpeed: number;
  /** Distance at which orbs start flying towards the player. */
  pickupRadius: number;
  /** HP per second. */
  regen: number;
  damageMultiplier: number;
  /** Fraction of incoming damage that is blocked, 0 to 1. */
  armor: number;
  areaMultiplier: number;
  cooldownMultiplier: number;
}

export const BASE_HP = 100;
export const BASE_SPEED = 170;
export const BASE_PICKUP_RADIUS = 70;

export function computeStats(loadout: Loadout): PlayerStats {
  const level = (id: Parameters<typeof levelOf>[1]) => levelOf(loadout, id);
  return {
    maxHp: BASE_HP + 20 * level('greenEco'),
    moveSpeed: BASE_SPEED * (1 + 0.08 * level('blueEco')),
    pickupRadius: BASE_PICKUP_RADIUS * (1 + 0.35 * level('blueEco')),
    regen: 0.5 * level('greenEco'),
    damageMultiplier: 1 + 0.15 * level('redEco'),
    armor: 0.06 * level('armor'),
    areaMultiplier: 1 + 0.1 * level('amplifier'),
    cooldownMultiplier: 1 - 0.06 * level('tuneUp'),
  };
}
