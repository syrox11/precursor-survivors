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

/**
 * What each passive gives at a level. Levels have no cap, so anything that would break the game if it kept
 * growing (speed, cooldowns) gets closer and closer to a limit instead of growing forever.
 */
export const PASSIVE_EFFECTS = {
  /** Red Eco: extra damage, as a fraction (0.15 = +15%). */
  damage: (level: number) => 0.15 * level,
  /** Blue Eco: extra speed, approaching +80%. */
  speed: (level: number) => 0.8 * (1 - Math.pow(0.9, level)),
  /** Blue Eco: extra orb pickup range. */
  pickup: (level: number) => 0.35 * level,
  /** Green Eco: flat max health and HP per second. */
  maxHp: (level: number) => 20 * level,
  regen: (level: number) => 0.5 * level,
  /** Precursor Armor: share of damage blocked, before the MAX_ARMOR cap. */
  armor: (level: number) => 0.06 * level,
  /** Eco Amplifier: extra area. */
  area: (level: number) => 0.1 * level,
  /** Keira's Tune-up: cooldown cut, 6% of what is left per level so it never reaches 100%. */
  cooldownCut: (level: number) => 1 - Math.pow(0.94, level),
};

export function computeStats(loadout: Loadout, bonuses: Bonuses = NO_BONUSES): PlayerStats {
  const level = (id: Parameters<typeof levelOf>[1]) => levelOf(loadout, id);
  const fx = PASSIVE_EFFECTS;
  return {
    maxHp: BASE_HP + bonuses.maxHp + fx.maxHp(level('greenEco')),
    moveSpeed: BASE_SPEED * (1 + bonuses.speed + fx.speed(level('blueEco'))),
    pickupRadius: BASE_PICKUP_RADIUS * (1 + bonuses.pickup + fx.pickup(level('blueEco'))),
    regen: fx.regen(level('greenEco')),
    damageMultiplier: 1 + bonuses.damage + fx.damage(level('redEco')),
    armor: Math.min(MAX_ARMOR, bonuses.armor + fx.armor(level('armor'))),
    areaMultiplier: 1 + fx.area(level('amplifier')),
    cooldownMultiplier: 1 - fx.cooldownCut(level('tuneUp')),
    xpMultiplier: 1 + bonuses.xp,
  };
}
