import type { Point } from './combat/types';
import { ITEMS, type ItemId, type Loadout } from './logic/items';
import { MAPS, type MapId } from './logic/maps';

/** Read-only view of a run, exposed on `window.__precursor` when the URL has `?debug`. */
export interface DebugSnapshot {
  elapsed: number;
  hp: number;
  maxHp: number;
  level: number;
  kills: number;
  zone: number;
  player: Point;
  enemies: Point[];
  bosses: { name: string; hp: number; maxHp: number }[];
  bossesDefeated: number;
  orbs: Point[];
  /** Chests, oracles and characters waiting on the map. */
  field: { kind: 'chest' | 'pickup' | 'oracle' | 'npc'; x: number; y: number }[];
  loadout: Loadout;
  eco: { light: number; dark: number; active: 'light' | 'dark' | null };
  state: 'playing' | 'levelUp' | 'over';
}

declare global {
  interface Window {
    __precursor?: { snapshot(): DebugSnapshot };
  }
}

export function debugEnabled(search: string): boolean {
  return new URLSearchParams(search).has('debug');
}

/**
 * Starting loadout from `?items=scatter:3,arc:2` (debug only), on top of the normal start.
 * Unknown items and bad levels are skipped; slot limits are not enforced.
 */
export function debugLoadout(search: string): Loadout | undefined {
  const raw = new URLSearchParams(search).get('items');
  if (!raw) return undefined;
  const loadout: Loadout = {};
  for (const part of raw.split(',')) {
    const [id, levelText = '1'] = part.split(':');
    const level = Number(levelText);
    if (id in ITEMS && Number.isInteger(level) && level >= 1 && level <= ITEMS[id as ItemId].maxLevel) {
      loadout[id as ItemId] = level;
    }
  }
  return loadout;
}

/** Start the run this many seconds in, from `?t=270` (debug only), to jump to a zone or boss. */
export function debugStartTime(search: string): number {
  const t = Number(new URLSearchParams(search).get('t'));
  return Number.isFinite(t) && t > 0 ? t : 0;
}

/** `?debug&god`: Jak takes no damage, so tests can reach late-game states. */
export function debugGodMode(search: string): boolean {
  return debugEnabled(search) && new URLSearchParams(search).has('god');
}

/** `?map=jak2` plays that map whether or not it is unlocked (debug only). */
export function debugMap(search: string): MapId | undefined {
  const map = new URLSearchParams(search).get('map');
  return map && map in MAPS ? (map as MapId) : undefined;
}

/** `?eco=100` starts the run with both eco meters at that value (debug only). */
export function debugEco(search: string): number {
  const value = Number(new URLSearchParams(search).get('eco'));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function exposeDebug(snapshot: () => DebugSnapshot): void {
  window.__precursor = { snapshot };
}
