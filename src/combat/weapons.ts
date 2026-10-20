import type { WeaponId } from '../logic/items';
import { weaponStats } from '../logic/weapons';
import {
  BeamReflexor, GyroBurster, MassInverter, NeedleLazer, PlasmiteRpg, SuperNova, WaveConcussor,
} from './morphMods';
import type { Combat, Enemy, Point } from './types';
import { aimAngle, angleTo, CooldownWeapon, FX_DEPTH, type Weapon } from './weaponBase';

export type { Weapon } from './weaponBase';

class SpinKick extends CooldownWeapon {
  protected baseCooldown(level: number) {
    return weaponStats('spin', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const { damage, radius: base } = weaponStats('spin', level);
    const radius = this.area(c, base);
    const ring = c.scene.add.circle(c.player.x, c.player.y, radius)
      .setStrokeStyle(4, 0x7fd8ff, 0.9)
      .setDepth(FX_DEPTH)
      .setScale(0.3);
    c.scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 250, onComplete: () => ring.destroy() });

    for (const enemy of [...c.enemies]) {
      if (Math.hypot(enemy.sprite.x - c.player.x, enemy.sprite.y - c.player.y) <= radius + enemy.def.radius) {
        c.damage(enemy, this.damage(c, damage), c.player);
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
    const { damage, count: base } = weaponStats('yellowEco', level);
    const count = base + this.mods.extra;
    const targets = c.nearestEnemies(count);
    if (targets.length === 0) return false;
    for (let i = 0; i < count; i++) {
      // Extra blasts beyond the number of targets fan out around the closest ones
      const extra = i >= targets.length ? (i - targets.length + 1) * 0.25 : 0;
      c.fire({
        texture: 'blast', x: c.player.x, y: c.player.y,
        angle: angleTo(c.player, targets[i % targets.length].sprite) + extra,
        speed: 420, life: 1.4, radius: 7, damage: this.damage(c, damage),
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
    const { damage, pellets: base, spread } = weaponStats('scatter', level);
    const pellets = base + 2 * this.mods.extra;
    const center = aimAngle(c);
    for (let i = 0; i < pellets; i++) {
      const offset = pellets === 1 ? 0 : -spread / 2 + (spread * i) / (pellets - 1);
      c.fire({
        texture: 'pellet', x: c.player.x, y: c.player.y, angle: center + offset,
        speed: 540, life: 0.32, radius: 5, damage: this.damage(c, damage),
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
    const targets = c.nearestEnemies(1 + this.mods.extra);
    if (targets.length === 0) return false;
    for (const target of targets) {
      c.fire({
        texture: 'bolt', x: c.player.x, y: c.player.y, angle: angleTo(c.player, target.sprite),
        speed: 650, life: 0.9, radius: 6, damage: this.damage(c, damage), pierce, rotate: true,
      });
    }
    return true;
  }
}

/** Queues a burst on cooldown, then fires one bullet every SHOT_GAP towards where Jak faces. */
class VulcanFury extends CooldownWeapon {
  private static readonly SHOT_GAP = 0.06;
  private queued = 0;
  private gap = 0;
  private shotDamage = 0;

  protected override tick(dt: number, c: Combat): void {
    this.gap -= dt;
    while (this.queued > 0 && this.gap <= 0) {
      this.gap += VulcanFury.SHOT_GAP;
      this.queued--;
      c.fire({
        texture: 'vulcanShot', x: c.player.x, y: c.player.y, angle: aimAngle(c) + (c.rng() - 0.5) * 0.25,
        speed: 600, life: 0.7, radius: 5, damage: this.shotDamage,
      });
    }
    if (this.queued === 0) this.gap = Math.max(this.gap, 0);
  }

  protected baseCooldown(level: number) {
    return weaponStats('vulcan', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const { burst, damage } = weaponStats('vulcan', level);
    this.queued = burst + 3 * this.mods.extra;
    this.shotDamage = this.damage(c, damage);
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
      explosion: { radius: this.area(c, radius), damage: this.damage(c, damage), color: 0x9d4edd },
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
    const [first] = c.nearestEnemies(1, c.player, this.area(c, ArcWielder.FIRST_RANGE));
    if (!first) return false;

    const hit: Enemy[] = [first];
    while (hit.length < chains + this.mods.extra + 1) {
      const last = hit[hit.length - 1].sprite;
      const next = c.nearestEnemies(hit.length + 1, last, this.area(c, range)).find((e) => !hit.includes(e));
      if (!next) break;
      hit.push(next);
    }

    const points: Point[] = [c.player, ...hit.map((e) => ({ x: e.sprite.x, y: e.sprite.y }))];
    drawLightning(c, points, 0x90e0ef);
    for (const enemy of hit) c.damage(enemy, this.damage(c, damage));
    return true;
  }
}

export function drawLightning(c: Combat, points: Point[], color: number): void {
  const g = c.scene.add.graphics().setDepth(FX_DEPTH);
  g.lineStyle(3, color, 1);
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

export function createWeapon(id: WeaponId): Weapon {
  switch (id) {
    case 'spin': return new SpinKick();
    case 'yellowEco': return new YellowEco();
    case 'scatter': return new ScatterGun();
    case 'blaster': return new Blaster();
    case 'vulcan': return new VulcanFury();
    case 'peacemaker': return new Peacemaker();
    case 'arc': return new ArcWielder();
    case 'waveConcussor': return new WaveConcussor();
    case 'plasmiteRpg': return new PlasmiteRpg();
    case 'beamReflexor': return new BeamReflexor();
    case 'gyroBurster': return new GyroBurster();
    case 'needleLazer': return new NeedleLazer();
    case 'massInverter': return new MassInverter();
    case 'superNova': return new SuperNova();
  }
}
