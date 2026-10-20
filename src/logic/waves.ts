import type { Rng } from './rng';

export type EnemyId = 'lurkerPuppy' | 'babak' | 'lurkerCrab';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  texture: string;
  hp: number;
  /** Pixels per second. */
  speed: number;
  /** Damage per second while touching the player. */
  dps: number;
  /** Collision radius in pixels. */
  radius: number;
  /** Orb value dropped on death. */
  xp: number;
  /** Seconds into the run before this enemy starts spawning. */
  unlockAt: number;
  /** Relative spawn weight once unlocked. */
  weight: number;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  lurkerPuppy: {
    id: 'lurkerPuppy', name: 'Lurker Puppy', texture: 'lurkerPuppy',
    hp: 8, speed: 95, dps: 8, radius: 10, xp: 1, unlockAt: 0, weight: 3,
  },
  babak: {
    id: 'babak', name: 'Babak', texture: 'babak',
    hp: 22, speed: 70, dps: 14, radius: 15, xp: 2, unlockAt: 90, weight: 2,
  },
  lurkerCrab: {
    id: 'lurkerCrab', name: 'Lurker Crab', texture: 'lurkerCrab',
    hp: 70, speed: 45, dps: 22, radius: 18, xp: 4, unlockAt: 210, weight: 1,
  },
};

export const MAX_ENEMIES = 500;

/** Seconds between spawns: starts at 0.55s and shrinks over time, never below 0.07s. */
export function spawnInterval(elapsed: number): number {
  return Math.max(0.07, 0.55 * Math.pow(0.85, elapsed / 30));
}

/** Enemy HP grows gently at first, then faster: ~x1.9 at 2 minutes, ~x10.6 at 10 minutes. */
export function hpMultiplier(elapsed: number): number {
  return 1 + elapsed / 180 + Math.pow(elapsed / 240, 2);
}

/** Contact damage grows linearly: x2.5 at 10 minutes. */
export function damageMultiplier(elapsed: number): number {
  return 1 + elapsed / 400;
}

export const HORDE_EVERY = 60;
export const FIRST_HORDE_MINUTE = 2;

/**
 * Size of the horde that surrounds the player when a full minute (from minute 2) ticks over between
 * `previous` and `elapsed`; 0 when no minute boundary was crossed.
 */
export function hordeSize(previous: number, elapsed: number): number {
  const minute = Math.floor(elapsed / HORDE_EVERY);
  if (minute < FIRST_HORDE_MINUTE || minute === Math.floor(previous / HORDE_EVERY)) return 0;
  return 10 + 5 * (minute - FIRST_HORDE_MINUTE);
}

export function unlockedEnemies(elapsed: number): EnemyDef[] {
  return Object.values(ENEMIES).filter((e) => elapsed >= e.unlockAt);
}

export function pickEnemy(elapsed: number, rng: Rng): EnemyDef {
  const pool = unlockedEnemies(elapsed);
  const total = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng() * total;
  for (const enemy of pool) {
    roll -= enemy.weight;
    if (roll < 0) return enemy;
  }
  return pool[pool.length - 1];
}
