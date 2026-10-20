import type { WeaponId } from './items';

/** Everything that lives between runs: companions, skins, permanent power-ups, challenges, battery rewards. */

export type CompanionId = 'daxter' | 'daxterPants' | 'pecker' | 'clank';
export type SkinId = 'jak1' | 'jak2' | 'jak3' | 'darkJak' | 'lightJak';
export type PowerUpId = 'vitality' | 'might' | 'swiftness' | 'magnet' | 'growth' | 'plating' | 'reroll';
export type ChallengeId = 'powerCell' | 'exterminator' | 'veteran';

export interface CompanionDef {
  id: CompanionId;
  name: string;
  description: string;
  texture: string;
  /** Batteries to unlock; 0 = available from the start. */
  cost: number;
}

export const COMPANIONS: Record<CompanionId, CompanionDef> = {
  daxter: {
    id: 'daxter', name: 'Daxter', texture: 'daxter', cost: 0,
    description: '+10% speed, attracts orbs from further away',
  },
  daxterPants: {
    id: 'daxterPants', name: 'Daxter (with pants)', texture: 'daxterPants', cost: 60,
    description: 'Sprays bug spray at nearby Lurkers',
  },
  pecker: {
    id: 'pecker', name: 'Pecker', texture: 'pecker', cost: 50,
    description: '+15% XP and warns you before each horde',
  },
  clank: {
    id: 'clank', name: 'Clank', texture: 'clank', cost: 100,
    description: 'Shield that blocks all damage for 1.5s, recharges every 12s',
  },
};

export interface SkinDef {
  id: SkinId;
  name: string;
  texture: string;
  /** Batteries to unlock; 0 = default; null = only from a challenge. */
  cost: number | null;
}

export const SKINS: Record<SkinId, SkinDef> = {
  jak1: { id: 'jak1', name: 'Jak (classic)', texture: 'jak-jak1', cost: 0 },
  jak2: { id: 'jak2', name: 'Jak II', texture: 'jak-jak2', cost: 40 },
  jak3: { id: 'jak3', name: 'Jak 3 (wasteland)', texture: 'jak-jak3', cost: 60 },
  darkJak: { id: 'darkJak', name: 'Dark Jak', texture: 'jak-darkJak', cost: null },
  lightJak: { id: 'lightJak', name: 'Light Jak', texture: 'jak-lightJak', cost: null },
};

/** Batteries to unlock a weapon as a starting choice. Every weapon can still drop on level up. */
export const WEAPON_UNLOCK_COST: Record<WeaponId, number> = {
  spin: 0,
  yellowEco: 30,
  scatter: 40,
  blaster: 40,
  vulcan: 60,
  peacemaker: 80,
  arc: 80,
};

export interface PowerUpDef {
  id: PowerUpId;
  name: string;
  /** Effect of one rank. */
  description: string;
  maxRank: number;
  /** Rank n costs baseCost * n. */
  baseCost: number;
}

export const POWER_UPS: Record<PowerUpId, PowerUpDef> = {
  vitality: { id: 'vitality', name: 'Vitality', description: '+10 max health', maxRank: 5, baseCost: 20 },
  might: { id: 'might', name: 'Might', description: '+5% damage', maxRank: 5, baseCost: 25 },
  swiftness: { id: 'swiftness', name: 'Swiftness', description: '+4% speed', maxRank: 3, baseCost: 20 },
  magnet: { id: 'magnet', name: 'Magnet', description: '+15% orb pickup range', maxRank: 3, baseCost: 15 },
  growth: { id: 'growth', name: 'Growth', description: '+5% XP', maxRank: 5, baseCost: 25 },
  plating: { id: 'plating', name: 'Plating', description: '-3% damage taken', maxRank: 3, baseCost: 30 },
  reroll: { id: 'reroll', name: 'Reroll', description: '+1 reroll per run on level up', maxRank: 3, baseCost: 40 },
};

export function powerUpCost(id: PowerUpId, currentRank: number): number | null {
  const def = POWER_UPS[id];
  return currentRank >= def.maxRank ? null : def.baseCost * (currentRank + 1);
}

/** Price of the next ban slot, by how many you own. */
export const BAN_SLOT_COSTS = [30, 60, 90];

export interface RunSummary {
  won: boolean;
  /** Seconds survived. */
  time: number;
  kills: number;
  level: number;
  bossesDefeated: number;
}

export interface ChallengeDef {
  id: ChallengeId;
  name: string;
  description: string;
  reward: number;
  unlocksSkin?: SkinId;
  isMet(run: RunSummary): boolean;
}

export const CHALLENGES: Record<ChallengeId, ChallengeDef> = {
  powerCell: {
    id: 'powerCell', name: 'Power Cell', description: 'Survive 10 minutes and defeat the final boss',
    reward: 50, unlocksSkin: 'darkJak', isMet: (run) => run.won,
  },
  exterminator: {
    id: 'exterminator', name: 'Exterminator', description: 'Defeat 1000 Lurkers in one run',
    reward: 30, unlocksSkin: 'lightJak', isMet: (run) => run.kills >= 1000,
  },
  veteran: {
    id: 'veteran', name: 'Veteran', description: 'Reach level 30',
    reward: 30, isMet: (run) => run.level >= 30,
  },
};

export const POWER_CELL_BONUS = 25;
export const BOSS_BONUS = 5;

/** 1 battery per 30 seconds survived, 1 per 100 Lurkers, 5 per boss, plus a bonus for the Power Cell. */
export function batteriesForRun(run: RunSummary): number {
  return Math.floor(run.time / 30) + Math.floor(run.kills / 100) + BOSS_BONUS * run.bossesDefeated
    + (run.won ? POWER_CELL_BONUS : 0);
}

/** Additive bonuses applied on top of item stats. 0.1 = +10%. */
export interface Bonuses {
  maxHp: number;
  damage: number;
  speed: number;
  pickup: number;
  xp: number;
  armor: number;
}

export const NO_BONUSES: Bonuses = { maxHp: 0, damage: 0, speed: 0, pickup: 0, xp: 0, armor: 0 };

export function bonusesFor(powerUps: Partial<Record<PowerUpId, number>>, companion: CompanionId): Bonuses {
  const rank = (id: PowerUpId) => powerUps[id] ?? 0;
  return {
    maxHp: 10 * rank('vitality'),
    damage: 0.05 * rank('might'),
    speed: 0.04 * rank('swiftness') + (companion === 'daxter' ? 0.1 : 0),
    pickup: 0.15 * rank('magnet') + (companion === 'daxter' ? 0.25 : 0),
    xp: 0.05 * rank('growth') + (companion === 'pecker' ? 0.15 : 0),
    armor: 0.03 * rank('plating'),
  };
}
