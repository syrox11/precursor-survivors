import type { Point } from './combat/types';
import { ITEMS, type ItemId, type Loadout } from './logic/items';

/** Read-only view of a run, exposed on `window.__precursor` when the URL has `?debug`. */
export interface DebugSnapshot {
  elapsed: number;
  hp: number;
  maxHp: number;
  level: number;
  kills: number;
  player: Point;
  enemies: Point[];
  orbs: Point[];
  loadout: Loadout;
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

export function exposeDebug(snapshot: () => DebugSnapshot): void {
  window.__precursor = { snapshot };
}
