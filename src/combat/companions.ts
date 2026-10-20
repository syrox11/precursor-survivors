import type * as Phaser from 'phaser';
import type { CompanionId } from '../logic/meta';
import { hordeSize } from '../logic/waves';
import type { Combat } from './types';

/** What a companion sees on top of the weapons' view. */
export interface CompanionContext extends Combat {
  readonly elapsed: number;
  /** Player level, for companions whose damage grows with the run. */
  readonly level: number;
  readonly sprite: Phaser.GameObjects.Image;
  say(text: string): void;
}

export interface Companion {
  update(dt: number, c: CompanionContext): void;
  /** Contact damage passes through here before it hits Jak; returns what is actually taken. */
  absorb(damage: number, c: CompanionContext): number;
}

const FX_DEPTH = 6;

/** Stat-only companion: its bonus is applied through meta bonuses. */
class Passive implements Companion {
  update(_dt: number, _c: CompanionContext): void {}

  absorb(damage: number, _c: CompanionContext): number {
    return damage;
  }
}

/** Sprays the closest Lurkers near Jak every so often. Damage grows with Jak's level. */
class BugSpray extends Passive {
  private static readonly COOLDOWN = 1.1;
  private static readonly RANGE = 120;
  private static readonly TARGETS = 5;
  private timer = 0;

  override update(dt: number, c: CompanionContext): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    const targets = c.nearestEnemies(BugSpray.TARGETS, c.player, BugSpray.RANGE);
    if (targets.length === 0) return;
    this.timer = BugSpray.COOLDOWN;

    const damage = (6 + 0.8 * c.level) * c.stats.damageMultiplier;
    for (const enemy of targets) {
      const puff = c.scene.add.circle(c.sprite.x, c.sprite.y, 6, 0x9ef01a, 0.7).setDepth(FX_DEPTH);
      c.scene.tweens.add({
        targets: puff, x: enemy.sprite.x, y: enemy.sprite.y, scale: 2.2, alpha: 0, duration: 220,
        onComplete: () => puff.destroy(),
      });
      c.damage(enemy, damage);
    }
  }
}

/** Shouts a few seconds before each horde. His XP bonus comes from meta bonuses. */
class Lookout extends Passive {
  private static readonly WARNING = 3;
  private previous = 0;

  override update(_dt: number, c: CompanionContext): void {
    if (hordeSize(this.previous + Lookout.WARNING, c.elapsed + Lookout.WARNING) > 0) {
      c.say('Horde incoming!');
    }
    this.previous = c.elapsed;
  }
}

/** Blocks all damage for a moment when Jak gets hit, then needs to recharge. */
class Shield extends Passive {
  private static readonly DURATION = 1.5;
  private static readonly RECHARGE = 12;
  private active = 0;
  private recharge = 0;
  private bubble?: Phaser.GameObjects.Arc;

  override update(dt: number, c: CompanionContext): void {
    if (this.active > 0) {
      this.active -= dt;
      this.bubble?.setPosition(c.player.x, c.player.y);
      if (this.active <= 0) {
        this.bubble?.destroy();
        this.bubble = undefined;
        this.recharge = Shield.RECHARGE;
      }
    } else if (this.recharge > 0) {
      this.recharge -= dt;
    }
    // Clank dims while recharging so you can tell when the shield is back
    c.sprite.setAlpha(this.active <= 0 && this.recharge > 0 ? 0.45 : 1);
  }

  override absorb(damage: number, c: CompanionContext): number {
    if (this.active > 0) return 0;
    if (this.recharge > 0) return damage;
    this.active = Shield.DURATION;
    this.bubble = c.scene.add.circle(c.player.x, c.player.y, 26, 0x4cc9f0, 0.25)
      .setStrokeStyle(2, 0x90e0ef, 0.9)
      .setDepth(FX_DEPTH);
    return 0;
  }
}

export function createCompanion(id: CompanionId): Companion {
  switch (id) {
    case 'daxter': return new Passive();
    case 'daxterPants': return new BugSpray();
    case 'pecker': return new Lookout();
    case 'clank': return new Shield();
  }
}
