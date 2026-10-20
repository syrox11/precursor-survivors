import { ZONE_DURATION } from './maps';
import type { Rng } from './rng';

export type ChestContent = 'health' | 'magnet' | 'jetBoard';

export const CHEST_WEIGHTS: Record<ChestContent, number> = { health: 4, magnet: 3, jetBoard: 3 };

/** Share of max health a health pickup restores. */
export const HEALTH_PICKUP = 0.4;
export const JET_BOARD = { speedMultiplier: 1.6, seconds: 10 };

export const FIRST_CHEST = 20;
export const CHEST_EVERY = 35;
export const MAX_CHESTS = 4;

/** Seconds into each zone when its character and its oracle show up, and how long they wait for you. */
export const NPC_AT = 45;
export const ORACLE_AT = 80;
export const NPC_STAYS = 45;
export const ORACLE_STAYS = 40;

export function rollChest(rng: Rng): ChestContent {
  const entries = Object.entries(CHEST_WEIGHTS) as [ChestContent, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [content, weight] of entries) {
    roll -= weight;
    if (roll < 0) return content;
  }
  return entries[entries.length - 1][0];
}

/** True when a scheduled moment `at` falls in the step from `previous` (exclusive) to `elapsed` (inclusive). */
export function crossed(at: number, previous: number, elapsed: number): boolean {
  return previous < at && at <= elapsed;
}

/** Chest spawns: one at FIRST_CHEST, then every CHEST_EVERY seconds. */
export function chestDue(previous: number, elapsed: number): boolean {
  if (elapsed < FIRST_CHEST) return false;
  const index = Math.floor((elapsed - FIRST_CHEST) / CHEST_EVERY);
  return crossed(FIRST_CHEST + index * CHEST_EVERY, previous, elapsed);
}

/** Zone index whose `offset`-seconds moment falls in this step, or undefined. */
export function zoneEventDue(offset: number, zones: number, previous: number, elapsed: number): number | undefined {
  for (let zone = 0; zone < zones; zone++) {
    if (crossed(zone * ZONE_DURATION + offset, previous, elapsed)) return zone;
  }
  return undefined;
}
