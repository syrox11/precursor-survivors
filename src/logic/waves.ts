import type { Rng } from './rng';

export type EnemyId =
  // Jak 1
  | 'lurkerPuppy' | 'lurkerCrab' | 'babak' | 'flyingLurker' | 'boneArmor' | 'spider'
  // Jak II
  | 'krimzonGuard' | 'guardGunner' | 'metalGrunt' | 'metalFlitter' | 'metalBrute';

/**
 * chase: walks straight at Jak.
 * zigzag: weaves side to side while closing in.
 * charge: walks, then dashes at Jak every few seconds.
 * shooter: keeps its distance and fires at Jak.
 */
export type EnemyBehavior = 'chase' | 'zigzag' | 'charge' | 'shooter';

export interface EnemyShot {
  /** Base damage per hit, scaled with time like contact damage. */
  damage: number;
  /** Seconds between shots. */
  every: number;
  /** Distance it tries to keep from Jak. */
  range: number;
}

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
  behavior: EnemyBehavior;
  /** Only for shooters. */
  shot?: EnemyShot;
}

const enemy = (def: EnemyDef) => def;

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  lurkerPuppy: enemy({
    id: 'lurkerPuppy', name: 'Lurker Puppy', texture: 'lurkerPuppy',
    hp: 8, speed: 95, dps: 8, radius: 10, xp: 1, behavior: 'chase',
  }),
  lurkerCrab: enemy({
    id: 'lurkerCrab', name: 'Lurker Crab', texture: 'lurkerCrab',
    hp: 40, speed: 45, dps: 18, radius: 18, xp: 3, behavior: 'chase',
  }),
  babak: enemy({
    id: 'babak', name: 'Babak', texture: 'babak',
    hp: 22, speed: 70, dps: 14, radius: 15, xp: 2, behavior: 'chase',
  }),
  flyingLurker: enemy({
    id: 'flyingLurker', name: 'Flying Lurker', texture: 'flyingLurker',
    hp: 12, speed: 120, dps: 10, radius: 11, xp: 2, behavior: 'zigzag',
  }),
  boneArmor: enemy({
    id: 'boneArmor', name: 'Bone Armor Lurker', texture: 'boneArmor',
    hp: 60, speed: 55, dps: 24, radius: 17, xp: 4, behavior: 'charge',
  }),
  spider: enemy({
    id: 'spider', name: 'Lava Spider', texture: 'spider',
    hp: 10, speed: 115, dps: 9, radius: 9, xp: 1, behavior: 'chase',
  }),
  krimzonGuard: enemy({
    id: 'krimzonGuard', name: 'Krimzon Guard', texture: 'krimzonGuard',
    hp: 24, speed: 75, dps: 14, radius: 14, xp: 2, behavior: 'chase',
  }),
  guardGunner: enemy({
    id: 'guardGunner', name: 'Krimzon Gunner', texture: 'guardGunner',
    hp: 16, speed: 70, dps: 8, radius: 13, xp: 2, behavior: 'shooter',
    shot: { damage: 9, every: 2.6, range: 260 },
  }),
  metalGrunt: enemy({
    id: 'metalGrunt', name: 'Metal Head Grunt', texture: 'metalGrunt',
    hp: 30, speed: 80, dps: 16, radius: 15, xp: 2, behavior: 'chase',
  }),
  metalFlitter: enemy({
    id: 'metalFlitter', name: 'Metal Head Flitter', texture: 'metalFlitter',
    hp: 12, speed: 135, dps: 10, radius: 10, xp: 1, behavior: 'zigzag',
  }),
  metalBrute: enemy({
    id: 'metalBrute', name: 'Metal Head Brute', texture: 'metalBrute',
    hp: 70, speed: 50, dps: 26, radius: 19, xp: 4, behavior: 'charge',
  }),
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

export interface SpawnEntry {
  enemy: EnemyId;
  weight: number;
  /** Seconds into the run before this entry starts spawning. */
  after?: number;
}

/** The entries of a zone's pool that are active at `elapsed`. */
export function activeEntries(pool: readonly SpawnEntry[], elapsed: number): SpawnEntry[] {
  return pool.filter((entry) => elapsed >= (entry.after ?? 0));
}

export function pickEnemy(pool: readonly SpawnEntry[], elapsed: number, rng: Rng): EnemyDef {
  const active = activeEntries(pool, elapsed);
  const total = active.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng() * total;
  for (const entry of active) {
    roll -= entry.weight;
    if (roll < 0) return ENEMIES[entry.enemy];
  }
  return ENEMIES[active[active.length - 1].enemy];
}
