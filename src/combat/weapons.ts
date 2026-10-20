import type { WeaponId } from '../logic/items';
import { effectiveCooldown, weaponStats } from '../logic/weapons';
import type { Combat, Enemy, Point } from './types';

export interface Weapon {
  update(dt: number, level: number, combat: Combat): void;
}

const FX_DEPTH = 6;

/** Fires when the cooldown is up. `trigger` returns false when there was nothing to shoot at. */
abstract class CooldownWeapon implements Weapon {
  private timer = 0;

  update(dt: number, level: number, combat: Combat): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    if (this.trigger(level, combat)) {
      this.timer = effectiveCooldown(this.baseCooldown(level), combat.stats.cooldownMultiplier);
    }
  }

  protected abstract baseCooldown(level: number): number;
  protected abstract trigger(level: number, combat: Combat): boolean;
}

const angleTo = (from: Point, to: Point) => Math.atan2(to.y - from.y, to.x - from.x);
const aimAngle = (c: Combat) => Math.atan2(c.aim.y, c.aim.x);

class SpinKick extends CooldownWeapon {
  protected baseCooldown(level: number) {
    return weaponStats('spin', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const { damage, radius: base } = weaponStats('spin', level);
    const radius = base * c.stats.areaMultiplier;
    const ring = c.scene.add.circle(c.player.x, c.player.y, radius)
      .setStrokeStyle(4, 0x7fd8ff, 0.9)
      .setDepth(FX_DEPTH)
      .setScale(0.3);
    c.scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 250, onComplete: () => ring.destroy() });

    for (const enemy of [...c.enemies]) {
      if (Math.hypot(enemy.sprite.x - c.player.x, enemy.sprite.y - c.player.y) <= radius + enemy.def.radius) {
        c.damage(enemy, damage * c.stats.damageMultiplier, c.player);
      }
    }
    return true;
  }
}

class YellowEco extends CooldownWeapon {
  protected baseCooldown(level: number) {
    return weaponStats('yellowEco', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const { damage, count } = weaponStats('yellowEco', level);
    const targets = c.nearestEnemies(count);
    if (targets.length === 0) return false;
    for (let i = 0; i < count; i++) {
      // Extra blasts beyond the number of targets fan out around the closest ones
      const extra = i >= targets.length ? (i - targets.length + 1) * 0.25 : 0;
      c.fire({
        texture: 'blast', x: c.player.x, y: c.player.y,
        angle: angleTo(c.player, targets[i % targets.length].sprite) + extra,
        speed: 420, life: 1.4, radius: 7, damage: damage * c.stats.damageMultiplier,
      });
    }
    return true;
  }
}

class ScatterGun extends CooldownWeapon {
  protected baseCooldown(level: number) {
    return weaponStats('scatter', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const { damage, pellets, spread } = weaponStats('scatter', level);
    const center = aimAngle(c);
    for (let i = 0; i < pellets; i++) {
      const offset = pellets === 1 ? 0 : -spread / 2 + (spread * i) / (pellets - 1);
      c.fire({
        texture: 'pellet', x: c.player.x, y: c.player.y, angle: center + offset,
        speed: 540, life: 0.32, radius: 5, damage: damage * c.stats.damageMultiplier,
      });
    }
    return true;
  }
}

class Blaster extends CooldownWeapon {
  protected baseCooldown(level: number) {
    return weaponStats('blaster', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const { damage, pierce } = weaponStats('blaster', level);
    const [target] = c.nearestEnemies(1);
    if (!target) return false;
    c.fire({
      texture: 'bolt', x: c.player.x, y: c.player.y, angle: angleTo(c.player, target.sprite),
      speed: 650, life: 0.9, radius: 6, damage: damage * c.stats.damageMultiplier, pierce, rotate: true,
    });
    return true;
  }
}

/** Queues a burst on cooldown, then fires one bullet every SHOT_GAP towards where Jak faces. */
class VulcanFury extends CooldownWeapon {
  private static readonly SHOT_GAP = 0.06;
  private queued = 0;
  private gap = 0;
  private damage = 0;

  override update(dt: number, level: number, c: Combat): void {
    super.update(dt, level, c);
    this.gap -= dt;
    while (this.queued > 0 && this.gap <= 0) {
      this.gap += VulcanFury.SHOT_GAP;
      this.queued--;
      c.fire({
        texture: 'vulcanShot', x: c.player.x, y: c.player.y, angle: aimAngle(c) + (c.rng() - 0.5) * 0.25,
        speed: 600, life: 0.7, radius: 5, damage: this.damage * c.stats.damageMultiplier,
      });
    }
    if (this.queued === 0) this.gap = Math.max(this.gap, 0);
  }

  protected baseCooldown(level: number) {
    return weaponStats('vulcan', level).cooldown;
  }

  protected trigger(level: number) {
    const { burst, damage } = weaponStats('vulcan', level);
    this.queued = burst;
    this.damage = damage;
    return true;
  }
}

class Peacemaker extends CooldownWeapon {
  protected baseCooldown(level: number) {
    return weaponStats('peacemaker', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const { damage, radius } = weaponStats('peacemaker', level);
    const [target] = c.nearestEnemies(1);
    if (!target) return false;
    c.fire({
      texture: 'peacemakerOrb', x: c.player.x, y: c.player.y, angle: angleTo(c.player, target.sprite),
      speed: 230, life: 1.8, radius: 11, damage: 0,
      explosion: { radius: radius * c.stats.areaMultiplier, damage: damage * c.stats.damageMultiplier, color: 0x9d4edd },
    });
    return true;
  }
}

/** Lightning to the closest Lurker, then hopping to the next closest one not hit yet. */
class ArcWielder extends CooldownWeapon {
  private static readonly FIRST_RANGE = 280;

  protected baseCooldown(level: number) {
    return weaponStats('arc', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const { damage, chains, range } = weaponStats('arc', level);
    const area = c.stats.areaMultiplier;
    const [first] = c.nearestEnemies(1, c.player, ArcWielder.FIRST_RANGE * area);
    if (!first) return false;

    const hit: Enemy[] = [first];
    while (hit.length < chains + 1) {
      const last = hit[hit.length - 1].sprite;
      const next = c.nearestEnemies(hit.length + 1, last, range * area).find((e) => !hit.includes(e));
      if (!next) break;
      hit.push(next);
    }

    const points: Point[] = [c.player, ...hit.map((e) => ({ x: e.sprite.x, y: e.sprite.y }))];
    this.drawLightning(c, points);
    for (const enemy of hit) c.damage(enemy, damage * c.stats.damageMultiplier);
    return true;
  }

  private drawLightning(c: Combat, points: Point[]): void {
    const g = c.scene.add.graphics().setDepth(FX_DEPTH);
    g.lineStyle(3, 0x90e0ef, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      // Two jagged midpoints per segment so it reads as lightning, not a laser
      for (const t of [0.33, 0.66]) {
        g.lineTo(a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 16, a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 16);
      }
      g.lineTo(b.x, b.y);
    }
    g.strokePath();
    c.scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }
}

export function createWeapon(id: WeaponId): Weapon {
  switch (id) {
    case 'spin': return new SpinKick();
    case 'yellowEco': return new YellowEco();
    case 'scatter': return new ScatterGun();
    case 'blaster': return new Blaster();
    case 'vulcan': return new VulcanFury();
    case 'peacemaker': return new Peacemaker();
    case 'arc': return new ArcWielder();
  }
}
