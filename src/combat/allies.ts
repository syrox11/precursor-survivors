import type * as Phaser from 'phaser';
import type { AllyStyle } from '../logic/npcs';
import type { Combat } from './types';

interface Ally {
  sprite: Phaser.GameObjects.Image;
  style: AllyStyle;
  timeLeft: number;
  fireTimer: number;
  /** Where around Jak this ally stands. */
  slot: number;
  /** Turrets stay where they were placed. */
  stationary: boolean;
}

const STYLES: Record<AllyStyle, { every: number; damage: number }> = {
  rifle: { every: 0.5, damage: 14 },
  blaster: { every: 0.22, damage: 7 },
  peacemaker: { every: 1.6, damage: 40 },
  turret: { every: 0.35, damage: 9 },
};

const DEPTH = 4;
const RANGE = 420;

/** Characters fighting next to Jak for a while. Their damage grows with the run so they stay useful. */
export class Allies {
  private allies: Ally[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  add(texture: string, style: AllyStyle, seconds: number, at: { x: number; y: number }): void {
    const sprite = this.scene.add.image(at.x, at.y, texture).setDepth(DEPTH);
    this.allies.push({ sprite, style, timeLeft: seconds, fireTimer: 0, slot: this.allies.length, stationary: style === 'turret' });
  }

  /** Stand a little behind and to the side of Jak. */
  private follow(ally: Ally, c: Combat, dt: number): void {
    const angle = Math.PI * 0.75 + ally.slot * 1.3;
    const tx = c.player.x + Math.cos(angle) * 45;
    const ty = c.player.y + Math.sin(angle) * 45;
    const lerp = Math.min(1, dt * 6);
    ally.sprite.x += (tx - ally.sprite.x) * lerp;
    ally.sprite.y += (ty - ally.sprite.y) * lerp;
  }

  update(dt: number, c: Combat, elapsed: number): void {
    const scale = (1 + elapsed / 120) * c.stats.damageMultiplier;
    for (let i = this.allies.length - 1; i >= 0; i--) {
      const ally = this.allies[i];
      ally.timeLeft -= dt;
      if (ally.timeLeft <= 0) {
        const { sprite } = ally;
        this.scene.tweens.add({ targets: sprite, alpha: 0, duration: 400, onComplete: () => sprite.destroy() });
        this.allies.splice(i, 1);
        continue;
      }

      if (!ally.stationary) this.follow(ally, c, dt);

      ally.fireTimer -= dt;
      if (ally.fireTimer > 0) continue;
      const [target] = c.nearestEnemies(1, ally.sprite, RANGE);
      if (!target) continue;
      const style = STYLES[ally.style];
      ally.fireTimer = style.every;
      const aim = Math.atan2(target.sprite.y - ally.sprite.y, target.sprite.x - ally.sprite.x);
      ally.sprite.setFlipX(target.sprite.x < ally.sprite.x);
      if (ally.style === 'turret') {
        c.fire({
          texture: 'blast', x: ally.sprite.x, y: ally.sprite.y, angle: aim, speed: 480, life: 1, radius: 7,
          damage: style.damage * scale,
        });
      } else if (ally.style === 'peacemaker') {
        c.fire({
          texture: 'peacemakerOrb', x: ally.sprite.x, y: ally.sprite.y, angle: aim, speed: 300, life: 1.4, radius: 11, damage: 0,
          explosion: { radius: 80, damage: style.damage * scale, color: 0x9d4edd },
        });
      } else {
        c.fire({
          texture: 'bolt', x: ally.sprite.x, y: ally.sprite.y, angle: aim, speed: 650, life: 0.8, radius: 6,
          damage: style.damage * scale, rotate: true,
        });
      }
    }
  }
}
