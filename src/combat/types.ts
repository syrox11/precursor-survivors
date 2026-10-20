import type * as Phaser from 'phaser';
import type { Rng } from '../logic/rng';
import type { PlayerStats } from '../logic/stats';
import type { BossDef } from '../logic/maps';
import type { EnemyDef } from '../logic/waves';

export interface Point {
  x: number;
  y: number;
}

/** What every enemy has, regular or boss. Regular enemies use their EnemyDef directly. */
export interface EnemyStats {
  name: string;
  speed: number;
  dps: number;
  radius: number;
  xp: number;
  behavior: EnemyDef['behavior'] | 'boss';
  shot?: EnemyDef['shot'];
}

export interface Enemy {
  sprite: Phaser.GameObjects.Image;
  def: EnemyStats;
  hp: number;
  maxHp: number;
  knockX: number;
  knockY: number;
  flash: number;
  /** Per-enemy clock for behaviours (zigzag phase, charge timing). */
  timer: number;
  /** Seconds left in a charge dash. */
  dashing: number;
  /** Seconds left unable to move or hurt Jak (Wave Concussor, Mass Inverter). Bosses ignore it. */
  stunned: number;
  /** Set for bosses: their definition and the zone they belong to. */
  boss?: { def: BossDef; zone: number };
}

export interface ProjectileSpec {
  texture: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  /** Seconds before it disappears. */
  life: number;
  damage: number;
  radius: number;
  /** Extra enemies it can go through after the first hit. */
  pierce?: number;
  /** Rotate the sprite to its direction of travel. */
  rotate?: boolean;
  /** Explodes on hit or when its life runs out, instead of a single-target hit. */
  explosion?: { radius: number; damage: number; color: number };
}

/** What a weapon can see and do. Implemented by the game scene. */
export interface Combat {
  readonly scene: Phaser.Scene;
  readonly player: Point;
  /** Unit vector of the last movement direction. */
  readonly aim: Point;
  readonly enemies: readonly Enemy[];
  readonly stats: PlayerStats;
  /** Seeded generator: use it for anything that affects gameplay. */
  readonly rng: Rng;
  damage(enemy: Enemy, amount: number, knockFrom?: Point): void;
  /** Closest enemies to `from` (default: the player), optionally within `maxDistance`. */
  nearestEnemies(count: number, from?: Point, maxDistance?: number): Enemy[];
  fire(spec: ProjectileSpec): void;
  explode(at: Point, radius: number, damage: number, color: number): void;
  /** Stops a regular enemy for a while; bosses shrug it off. */
  stun(enemy: Enemy, seconds: number): void;
  /** Regular enemies within `radius` of `at` go for it instead of Jak until it expires. */
  decoy(at: Point, radius: number, seconds: number): void;
}
