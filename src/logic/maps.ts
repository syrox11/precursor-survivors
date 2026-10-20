import type { SpawnEntry } from './waves';

export type MapId = 'jak1';
export type BossId = 'darkEcoPlant' | 'klaww' | 'giantSpider' | 'golMaiaRobot';

export interface BossDef {
  id: BossId;
  name: string;
  texture: string;
  /** Base HP, multiplied by bossHpMultiplier when it spawns. */
  hp: number;
  radius: number;
  /** Contact damage per second. */
  dps: number;
  /** Orbs dropped on death. */
  orbs: number;
}

export const BOSSES: Record<BossId, BossDef> = {
  darkEcoPlant: { id: 'darkEcoPlant', name: 'Dark Eco Plant', texture: 'darkEcoPlant', hp: 600, radius: 36, dps: 20, orbs: 25 },
  klaww: { id: 'klaww', name: 'Klaww', texture: 'klaww', hp: 600, radius: 40, dps: 26, orbs: 30 },
  giantSpider: { id: 'giantSpider', name: 'Giant Lava Spider', texture: 'giantSpider', hp: 1100, radius: 38, dps: 30, orbs: 35 },
  golMaiaRobot: { id: 'golMaiaRobot', name: "Gol and Maia's Precursor Robot", texture: 'golMaiaRobot', hp: 1400, radius: 50, dps: 36, orbs: 60 },
};

export interface GroundStyle {
  base: number;
  speckA: number;
  speckB: number;
}

export interface ZoneDef {
  name: string;
  ground: GroundStyle;
  /** Decoration textures scattered over the zone. */
  decor: string[];
  pool: SpawnEntry[];
  boss: BossId;
  /** Daxter's line when the zone starts. */
  quote: string;
}

export interface MapDef {
  id: MapId;
  name: string;
  zones: ZoneDef[];
}

export const ZONE_DURATION = 150;
/** Each zone's boss shows up this many seconds before the zone ends. */
export const BOSS_LEAD = 30;

export const MAPS: Record<MapId, MapDef> = {
  jak1: {
    id: 'jak1',
    name: 'The Precursor Legacy',
    zones: [
      {
        name: 'Sentinel Beach',
        ground: { base: 0xe6d3a3, speckA: 0xd8c08a, speckB: 0xf3e6c4 },
        decor: ['palm', 'rock'],
        pool: [{ enemy: 'lurkerPuppy', weight: 5 }, { enemy: 'lurkerCrab', weight: 1, after: 60 }],
        boss: 'darkEcoPlant',
        quote: 'Ah, the beach. Sun, sand... and Lurkers. Great.',
      },
      {
        name: "Blue Sage's Village",
        ground: { base: 0x9aa5ae, speckA: 0x7d8a94, speckB: 0xb7c2ca },
        decor: ['hut', 'rock'],
        pool: [{ enemy: 'babak', weight: 3 }, { enemy: 'flyingLurker', weight: 2 }, { enemy: 'lurkerPuppy', weight: 2 }],
        boss: 'klaww',
        quote: 'Rock Village... looks like somebody beat us here.',
      },
      {
        name: 'Volcanic Crater',
        ground: { base: 0x4a3b36, speckA: 0x2e2420, speckB: 0x8c3b1f },
        decor: ['lavaPool', 'darkRock'],
        pool: [{ enemy: 'boneArmor', weight: 2 }, { enemy: 'spider', weight: 3 }, { enemy: 'babak', weight: 2 }],
        boss: 'giantSpider',
        quote: 'Is it just me, or is it getting hot in here?',
      },
      {
        name: "Gol and Maia's Citadel",
        ground: { base: 0x3d3a5c, speckA: 0x2a2840, speckB: 0x6c63a8 },
        decor: ['pillar', 'darkRock'],
        pool: [
          { enemy: 'babak', weight: 2 }, { enemy: 'boneArmor', weight: 2 }, { enemy: 'flyingLurker', weight: 2 },
          { enemy: 'spider', weight: 2 }, { enemy: 'lurkerCrab', weight: 1 },
        ],
        boss: 'golMaiaRobot',
        quote: "This is it, Jak. Let's kick some sage butt!",
      },
    ],
  },
};

/**
 * Boss HP scales more gently than regular enemies, or late bosses become damage sponges:
 * x1.8 for the first boss at 2:00, x4.8 for the final one at 9:30.
 */
export function bossHpMultiplier(elapsed: number): number {
  return 1 + elapsed / 150;
}

/** Texture key of a zone's ground tile, generated at boot. */
export function groundTexture(map: MapId, zone: number): string {
  return `ground-${map}-${zone}`;
}

/** Index of the zone active at `elapsed`; stays on the last zone after the run time is up. */
export function zoneIndexAt(map: MapDef, elapsed: number): number {
  return Math.min(map.zones.length - 1, Math.max(0, Math.floor(elapsed / ZONE_DURATION)));
}

/** Seconds into the run when each zone's boss spawns. */
export function bossSpawnTime(zoneIndex: number): number {
  return (zoneIndex + 1) * ZONE_DURATION - BOSS_LEAD;
}

/** Zone indexes whose boss is due in the step from `previous` (exclusive) to `elapsed` (inclusive). */
export function bossesDue(map: MapDef, previous: number, elapsed: number): number[] {
  return map.zones
    .map((_, i) => i)
    .filter((i) => previous < bossSpawnTime(i) && bossSpawnTime(i) <= elapsed);
}

/** True when the step from `previous` to `elapsed` enters a new zone (not the first one). */
export function zoneChanged(map: MapDef, previous: number, elapsed: number): boolean {
  return zoneIndexAt(map, elapsed) !== zoneIndexAt(map, previous);
}
