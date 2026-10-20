import type * as Phaser from 'phaser';
import { PLAYER_RADIUS } from '../config';
import type { Point } from './types';

interface HostileShot {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  damage: number;
}

interface Hazard {
  at: Point;
  radius: number;
  delay: number;
  damage: number;
  marker: Phaser.GameObjects.Arc;
}

const SHOT_RADIUS = 7;
const SHOT_LIFE = 4;
const DEPTH = 6;

/** Boss attacks aimed at Jak: flying shots, and warned ground hits that land after a delay. */
export class HostileSystem {
  private shots: HostileShot[] = [];
  private hazards: Hazard[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    /** Called with the base damage of every hit on Jak. */
    private readonly onHit: (damage: number) => void,
  ) {}

  fire(from: Point, angle: number, speed: number, damage: number): void {
    const sprite = this.scene.add.image(from.x, from.y, 'darkEcoBall').setDepth(DEPTH);
    this.shots.push({ sprite, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: SHOT_LIFE, damage });
  }

  hazard(at: Point, radius: number, delay: number, damage: number, from?: Point): void {
    const marker = this.scene.add.circle(at.x, at.y, radius, 0xe5383b, 0.15)
      .setStrokeStyle(2, 0xe5383b, 0.8)
      .setDepth(DEPTH - 4);
    this.scene.tweens.add({ targets: marker, fillAlpha: 0.4, duration: delay * 1000 });
    if (from) {
      const rock = this.scene.add.image(from.x, from.y, 'boulder').setDepth(DEPTH);
      this.scene.tweens.add({
        targets: rock, x: at.x, y: at.y, angle: 360, duration: delay * 1000, onComplete: () => rock.destroy(),
      });
      // Arc the boulder up and down so it reads as a throw
      this.scene.tweens.add({ targets: rock, scale: 1.8, duration: (delay * 1000) / 2, yoyo: true });
    }
    this.hazards.push({ at: { ...at }, radius, delay, damage, marker });
  }

  update(dt: number, player: Point): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      shot.life -= dt;
      shot.sprite.x += shot.vx * dt;
      shot.sprite.y += shot.vy * dt;
      const hit = Math.hypot(shot.sprite.x - player.x, shot.sprite.y - player.y) < SHOT_RADIUS + PLAYER_RADIUS;
      if (hit) this.onHit(shot.damage);
      if (hit || shot.life <= 0) {
        shot.sprite.destroy();
        this.shots.splice(i, 1);
      }
    }

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hazard = this.hazards[i];
      hazard.delay -= dt;
      if (hazard.delay > 0) continue;
      if (Math.hypot(hazard.at.x - player.x, hazard.at.y - player.y) < hazard.radius + PLAYER_RADIUS) this.onHit(hazard.damage);
      const { marker } = hazard;
      this.scene.tweens.killTweensOf(marker);
      marker.setFillStyle(0xffb703, 0.6);
      this.scene.tweens.add({ targets: marker, alpha: 0, scale: 1.2, duration: 250, onComplete: () => marker.destroy() });
      this.hazards.splice(i, 1);
    }
  }
}
