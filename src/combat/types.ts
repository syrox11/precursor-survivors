import type * as Phaser from 'phaser';
import type { Rng } from '../logic/rng';
import type { PlayerStats } from '../logic/stats';
import type { EnemyDef } from '../logic/waves';

export interface Point {
  x: number;
  y: number;
}

export interface Enemy {
  sprite: Phaser.GameObjects.Image;
  def: EnemyDef;
  hp: number;
  knockX: number;
  knockY: number;
  flash: number;
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
}
