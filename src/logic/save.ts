import { ITEMS, type ItemId, type WeaponId } from './items';
import { MAP_ORDER, nextMap, type MapId } from './maps';
import {
  BAN_SLOT_COSTS, batteriesForRun, CHALLENGES, COMPANIONS, POWER_UPS, powerUpCost, SKINS, WEAPON_UNLOCK_COST,
  type ChallengeId, type CompanionId, type PowerUpId, type RunSummary, type SkinId,
} from './meta';

export const SAVE_KEY = 'precursor-survivors:save';
/** Phase 1-2 only stored the best time under this key. */
export const LEGACY_BEST_TIME_KEY = 'precursor-survivors:best-time';
export const SAVE_VERSION = 1;

/** Minimal slice of the Storage API so tests can pass an in-memory fake. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export interface RunSetup {
  map: MapId;
  weapon: WeaponId;
  companion: CompanionId;
  skin: SkinId;
  /** Items that never show up on level up. */
  banned: ItemId[];
}

export interface SaveData {
  version: number;
  batteries: number;
  weapons: WeaponId[];
  companions: CompanionId[];
  skins: SkinId[];
  /** Maps you can pick; winning one unlocks the next. */
  maps: MapId[];
  powerUps: Partial<Record<PowerUpId, number>>;
  banSlots: number;
  setup: RunSetup;
  bestTime: number;
  runs: number;
  wins: number;
  challenges: ChallengeId[];
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    batteries: 0,
    weapons: ['spin'],
    companions: ['daxter'],
    skins: ['jak1'],
    maps: ['jak1'],
    powerUps: {},
    banSlots: 0,
    setup: { map: 'jak1', weapon: 'spin', companion: 'daxter', skin: 'jak1', banned: [] },
    bestTime: 0,
    runs: 0,
    wins: 0,
    challenges: [],
  };
}

// ---- Loading: never trust what is in storage ----

const count = (value: unknown, max = Number.MAX_SAFE_INTEGER): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(Math.floor(value), max) : 0;

/** Keeps known ids only, without duplicates, always including the defaults. */
function idList<T extends string>(value: unknown, known: readonly T[], defaults: readonly T[]): T[] {
  const list = Array.isArray(value) ? value.filter((v): v is T => known.includes(v as T)) : [];
  return [...new Set([...defaults, ...list])];
}

/** Falls back to defaults for anything that isn't owned or allowed, and trims bans to the owned slots. */
export function sanitizeSetup(save: Omit<SaveData, 'setup'>, setup: Partial<RunSetup> | undefined): RunSetup {
  const fallback = defaultSave().setup;
  const map = setup?.map && save.maps.includes(setup.map) ? setup.map : fallback.map;
  const weapon = setup?.weapon && save.weapons.includes(setup.weapon) ? setup.weapon : fallback.weapon;
  const companion = setup?.companion && save.companions.includes(setup.companion) ? setup.companion : fallback.companion;
  const skin = setup?.skin && save.skins.includes(setup.skin) ? setup.skin : fallback.skin;
  const banned = idList(setup?.banned, Object.keys(ITEMS) as ItemId[], [])
    .filter((id) => id !== weapon)
    .slice(0, save.banSlots);
  return { map, weapon, companion, skin, banned };
}

export function parseSave(raw: string | null, legacyBestTime: string | null = null): SaveData {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>;
  } catch {
    // Corrupt save: start fresh rather than crash
  }
  const defaults = defaultSave();
  const powerUps: SaveData['powerUps'] = {};
  const rawPowerUps = (data.powerUps ?? {}) as Record<string, unknown>;
  for (const id of Object.keys(POWER_UPS) as PowerUpId[]) {
    const rank = count(rawPowerUps[id], POWER_UPS[id].maxRank);
    if (rank > 0) powerUps[id] = rank;
  }

  const base: Omit<SaveData, 'setup'> = {
    version: SAVE_VERSION,
    batteries: count(data.batteries),
    weapons: idList(data.weapons, Object.keys(WEAPON_UNLOCK_COST) as WeaponId[], defaults.weapons),
    companions: idList(data.companions, Object.keys(COMPANIONS) as CompanionId[], defaults.companions),
    skins: idList(data.skins, Object.keys(SKINS) as SkinId[], defaults.skins),
    maps: idList(data.maps, MAP_ORDER, defaults.maps),
    powerUps,
    banSlots: count(data.banSlots, BAN_SLOT_COSTS.length),
    bestTime: Math.max(count(data.bestTime), count(Number(legacyBestTime))),
    runs: count(data.runs),
    wins: count(data.wins),
    challenges: idList(data.challenges, Object.keys(CHALLENGES) as ChallengeId[], []),
  };
  return { ...base, setup: sanitizeSetup(base, data.setup as Partial<RunSetup> | undefined) };
}

/** Storage can be missing or throw (private mode, blocked site data): the game still works, just without saving. */
export function loadSave(store: KeyValueStore | undefined): SaveData {
  try {
    return parseSave(store?.getItem(SAVE_KEY) ?? null, store?.getItem(LEGACY_BEST_TIME_KEY) ?? null);
  } catch {
    return defaultSave();
  }
}

export function writeSave(store: KeyValueStore | undefined, save: SaveData): void {
  try {
    store?.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Not persisted; progress lives until the tab closes
  }
}

// ---- Shop ----

export type Purchase =
  | { kind: 'weapon'; id: WeaponId }
  | { kind: 'companion'; id: CompanionId }
  | { kind: 'skin'; id: SkinId }
  | { kind: 'powerUp'; id: PowerUpId }
  | { kind: 'banSlot' };

/** Batteries the purchase costs now, or null if it can't be bought (owned, maxed, challenge-only). */
export function priceOf(save: SaveData, purchase: Purchase): number | null {
  switch (purchase.kind) {
    case 'weapon':
      return save.weapons.includes(purchase.id) ? null : WEAPON_UNLOCK_COST[purchase.id];
    case 'companion':
      return save.companions.includes(purchase.id) ? null : COMPANIONS[purchase.id].cost;
    case 'skin':
      return save.skins.includes(purchase.id) ? null : SKINS[purchase.id].cost;
    case 'powerUp':
      return powerUpCost(purchase.id, save.powerUps[purchase.id] ?? 0);
    case 'banSlot':
      return BAN_SLOT_COSTS[save.banSlots] ?? null;
  }
}

/** The save after buying, or null when it isn't for sale or there aren't enough batteries. */
export function buy(save: SaveData, purchase: Purchase): SaveData | null {
  const price = priceOf(save, purchase);
  if (price === null || price > save.batteries) return null;
  const next: SaveData = { ...save, batteries: save.batteries - price };
  switch (purchase.kind) {
    case 'weapon': next.weapons = [...save.weapons, purchase.id]; break;
    case 'companion': next.companions = [...save.companions, purchase.id]; break;
    case 'skin': next.skins = [...save.skins, purchase.id]; break;
    case 'powerUp': next.powerUps = { ...save.powerUps, [purchase.id]: (save.powerUps[purchase.id] ?? 0) + 1 }; break;
    case 'banSlot': next.banSlots = save.banSlots + 1; break;
  }
  return next;
}

// ---- After a run ----

export interface RunReward {
  save: SaveData;
  /** Batteries from the run itself, without challenge rewards. */
  earned: number;
  completed: ChallengeId[];
  newRecord: boolean;
  /** Set when this win unlocked a new map. */
  unlockedMap?: MapId;
}

export function recordRun(save: SaveData, run: RunSummary): RunReward {
  const earned = batteriesForRun(run);
  const completed = (Object.keys(CHALLENGES) as ChallengeId[])
    .filter((id) => !save.challenges.includes(id) && CHALLENGES[id].isMet(run));
  const challengeBatteries = completed.reduce((sum, id) => sum + CHALLENGES[id].reward, 0);
  const unlockedSkins = completed.map((id) => CHALLENGES[id].unlocksSkin).filter((s): s is SkinId => !!s);
  const next = run.won ? nextMap(run.map) : undefined;
  const unlockedMap = next && !save.maps.includes(next) ? next : undefined;

  return {
    save: {
      ...save,
      batteries: save.batteries + earned + challengeBatteries,
      bestTime: Math.max(save.bestTime, Math.floor(run.time)),
      runs: save.runs + 1,
      wins: save.wins + (run.won ? 1 : 0),
      challenges: [...save.challenges, ...completed],
      skins: [...new Set([...save.skins, ...unlockedSkins])],
      maps: unlockedMap ? [...save.maps, unlockedMap] : save.maps,
    },
    earned,
    completed,
    newRecord: Math.floor(run.time) > save.bestTime,
    unlockedMap,
  };
}
