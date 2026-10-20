import type { SpawnEntry } from './waves';

export type MapId = 'jak1' | 'jak2' | 'jak3';
export type BossId =
  | 'darkEcoPlant' | 'klaww' | 'giantSpider' | 'golMaiaRobot'
  | 'errol' | 'krew' | 'praxis' | 'metalKor'
  | 'metalDino' | 'marauderChief' | 'veger' | 'darkMakerMachine';

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
  errol: { id: 'errol', name: 'Errol', texture: 'errol', hp: 600, radius: 30, dps: 24, orbs: 25 },
  krew: { id: 'krew', name: 'Krew', texture: 'krew', hp: 750, radius: 44, dps: 22, orbs: 30 },
  praxis: { id: 'praxis', name: 'Baron Praxis', texture: 'praxis', hp: 1100, radius: 34, dps: 30, orbs: 35 },
  metalKor: { id: 'metalKor', name: 'Metal Kor', texture: 'metalKor', hp: 1500, radius: 52, dps: 38, orbs: 60 },
  metalDino: { id: 'metalDino', name: 'Metal Head Dinosaur', texture: 'metalDino', hp: 650, radius: 46, dps: 26, orbs: 25 },
  marauderChief: { id: 'marauderChief', name: 'Marauder Chief', texture: 'marauderChief', hp: 450, radius: 34, dps: 24, orbs: 30 },
  veger: { id: 'veger', name: 'Count Veger', texture: 'veger', hp: 1100, radius: 30, dps: 26, orbs: 35 },
  darkMakerMachine: { id: 'darkMakerMachine', name: 'Dark Maker Machine', texture: 'darkMakerMachine', hp: 1600, radius: 56, dps: 40, orbs: 60 },
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
        name: "Green Sage's Village",
        ground: { base: 0xe6d3a3, speckA: 0xd8c08a, speckB: 0xf3e6c4 },
        decor: ['palm', 'greenHut', 'rock'],
        pool: [{ enemy: 'lurkerPuppy', weight: 5 }, { enemy: 'lurkerCrab', weight: 1, after: 60 }],
        boss: 'darkEcoPlant',
        quote: 'Home sweet home. Sun, sand... and Lurkers. Great.',
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
  jak2: {
    id: 'jak2',
    name: 'Renegade',
    zones: [
      {
        name: 'Haven City',
        ground: { base: 0x7a7f87, speckA: 0x5c6168, speckB: 0x9aa0a8 },
        decor: ['lamp', 'crate'],
        pool: [
          { enemy: 'krimzonGuard', weight: 3 }, { enemy: 'guardGunner', weight: 2, after: 30 },
          { enemy: 'metalGrunt', weight: 1, after: 60 },
        ],
        boss: 'errol',
        quote: 'Welcome to Haven City. Lovely place. Our faces on every wanted poster.',
      },
      {
        name: 'The Sewers',
        ground: { base: 0x3f4a3c, speckA: 0x2b332a, speckB: 0x5e7d4f },
        decor: ['pipe', 'puddle'],
        pool: [{ enemy: 'metalFlitter', weight: 3 }, { enemy: 'metalGrunt', weight: 2 }, { enemy: 'guardGunner', weight: 1 }],
        boss: 'krew',
        quote: 'Sewers. Why is it always sewers?',
      },
      {
        name: "Mar's Tomb",
        ground: { base: 0xb59b6a, speckA: 0x8c7448, speckB: 0xd6c08f },
        decor: ['statue', 'torch'],
        pool: [{ enemy: 'metalBrute', weight: 2 }, { enemy: 'metalFlitter', weight: 2 }, { enemy: 'guardGunner', weight: 2 }],
        boss: 'praxis',
        quote: 'Mar sure liked his traps. And his tombs. Mostly traps.',
      },
      {
        name: 'Metal Head Nest',
        ground: { base: 0x2d2a26, speckA: 0x1c1a17, speckB: 0x4f7a3a },
        decor: ['eggPod', 'darkRock'],
        pool: [
          { enemy: 'metalGrunt', weight: 2 }, { enemy: 'metalBrute', weight: 2 }, { enemy: 'metalFlitter', weight: 2 },
          { enemy: 'krimzonGuard', weight: 1 },
        ],
        boss: 'metalKor',
        quote: "The Metal Head Nest. Jak, I changed my mind, let's go home!",
      },
    ],
  },
  jak3: {
    id: 'jak3',
    name: 'Wastelander',
    zones: [
      {
        name: 'Spargus City',
        ground: { base: 0xd9b77a, speckA: 0xbf9a5c, speckB: 0xecd3a2 },
        decor: ['tent', 'palm', 'rock'],
        pool: [
          { enemy: 'marauder', weight: 3 }, { enemy: 'metalGrunt', weight: 1, after: 40 },
          { enemy: 'metalFlitter', weight: 1, after: 70 },
        ],
        boss: 'metalDino',
        quote: 'Spargus. Nice place, if you like sand in places sand should never be.',
      },
      {
        name: 'The Wasteland',
        ground: { base: 0xc9935a, speckA: 0xa8743e, speckB: 0xe0b07a },
        decor: ['bones', 'rock'],
        pool: [{ enemy: 'marauder', weight: 2 }, { enemy: 'marauderGunner', weight: 2 }, { enemy: 'metalBrute', weight: 1 }],
        boss: 'marauderChief',
        quote: 'Nothing but sand, Marauders... and more sand. I love it.',
      },
      {
        name: 'Precursor Temple',
        ground: { base: 0x5f6f5a, speckA: 0x45523f, speckB: 0x80ffdb },
        decor: ['statue', 'pillar'],
        pool: [{ enemy: 'precursorDrone', weight: 3 }, { enemy: 'templeGuardian', weight: 2 }, { enemy: 'marauderGunner', weight: 1 }],
        boss: 'veger',
        quote: 'A Precursor temple! Touch nothing. Okay, touch some things.',
      },
      {
        name: 'Haven City Ruins',
        ground: { base: 0x4a4a4a, speckA: 0x2f2f2f, speckB: 0xe85d04 },
        decor: ['rubble', 'crate'],
        pool: [
          { enemy: 'deathBot', weight: 3 }, { enemy: 'deathBotGunner', weight: 2 }, { enemy: 'metalBrute', weight: 1 },
          { enemy: 'precursorDrone', weight: 1 },
        ],
        boss: 'darkMakerMachine',
        quote: "Haven City... what's left of it. Let's finish this, Jak.",
      },
    ],
  },
};

/** Maps in unlock order: winning one unlocks the next. */
export const MAP_ORDER: MapId[] = ['jak1', 'jak2', 'jak3'];

export function nextMap(map: MapId): MapId | undefined {
  return MAP_ORDER[MAP_ORDER.indexOf(map) + 1];
}

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
