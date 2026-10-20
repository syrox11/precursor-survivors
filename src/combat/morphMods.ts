import type * as Phaser from 'phaser';
import { weaponStats } from '../logic/weapons';
import type { Combat, Enemy, Point } from './types';
import { aimAngle, alive, angleTo, CooldownWeapon, densestSpot, distance, FX_DEPTH } from './weaponBase';

/** The Jak 3 Morph Gun mods. Each one keeps its own in-flight state and updates it in `tick`. */

// ---- Red ----

interface Wave {
  ring: Phaser.GameObjects.Arc;
  origin: Point;
  radius: number;
  max: number;
  damage: number;
  stun: number;
  hit: Set<Enemy>;
}

/** A ring that sweeps outward across the screen: light damage, a hard shove and a short stun. Crowd control. */
export class WaveConcussor extends CooldownWeapon {
  private static readonly EXPAND_SECONDS = 0.55;
  private waves: Wave[] = [];

  protected baseCooldown(level: number) {
    return weaponStats('waveConcussor', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const { damage, radius, stun } = weaponStats('waveConcussor', level);
    const max = this.area(c, radius);
    const ring = c.scene.add.circle(c.player.x, c.player.y, max).setStrokeStyle(6, 0xff6b6b, 0.9).setDepth(FX_DEPTH).setScale(0.02);
    this.waves.push({ ring, origin: { x: c.player.x, y: c.player.y }, radius: 0, max, damage: this.damage(c, damage), stun, hit: new Set() });
    return true;
  }

  protected override tick(dt: number, c: Combat): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      wave.radius = Math.min(wave.max, wave.radius + (wave.max / WaveConcussor.EXPAND_SECONDS) * dt);
      wave.ring.setScale(wave.radius / wave.max).setAlpha(1 - (wave.radius / wave.max) * 0.7);
      for (const enemy of [...c.enemies]) {
        if (wave.hit.has(enemy) || distance(enemy.sprite, wave.origin) > wave.radius + enemy.def.radius) continue;
        wave.hit.add(enemy);
        c.damage(enemy, wave.damage, wave.origin);
        c.stun(enemy, wave.stun);
      }
      if (wave.radius >= wave.max) {
        wave.ring.destroy();
        this.waves.splice(i, 1);
      }
    }
  }
}

interface Rocket {
  sprite: Phaser.GameObjects.Image;
  target: Point;
}

interface PlasmaPool {
  at: Point;
  radius: number;
  timeLeft: number;
  tickTimer: number;
  burn: number;
  sprite: Phaser.GameObjects.Arc;
}

/** Fast rockets at the thickest crowd; each blast leaves a pool of burning plasma. Area denial. */
export class PlasmiteRpg extends CooldownWeapon {
  private static readonly SPEED = 520;
  private static readonly BURN_TICK = 0.5;
  private rockets: Rocket[] = [];
  private pools: PlasmaPool[] = [];
  private blast = { damage: 0, radius: 0, burn: 0, burnSeconds: 0 };

  protected baseCooldown(level: number) {
    return weaponStats('plasmiteRpg', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const target = densestSpot(c, 520);
    if (!target) return false;
    const { damage, radius, burn, burnSeconds } = weaponStats('plasmiteRpg', level);
    this.blast = { damage: this.damage(c, damage), radius: this.area(c, radius), burn: this.damage(c, burn), burnSeconds };
    const sprite = c.scene.add.image(c.player.x, c.player.y, 'rocket').setDepth(FX_DEPTH).setRotation(angleTo(c.player, target));
    this.rockets.push({ sprite, target });
    return true;
  }

  protected override tick(dt: number, c: Combat): void {
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rocket = this.rockets[i];
      const d = distance(rocket.sprite, rocket.target);
      const step = PlasmiteRpg.SPEED * dt;
      if (d > step) {
        rocket.sprite.x += ((rocket.target.x - rocket.sprite.x) / d) * step;
        rocket.sprite.y += ((rocket.target.y - rocket.sprite.y) / d) * step;
        continue;
      }
      rocket.sprite.destroy();
      this.rockets.splice(i, 1);
      const { damage, radius, burn, burnSeconds } = this.blast;
      c.explode(rocket.target, radius, damage, 0xff5400);
      const sprite = c.scene.add.circle(rocket.target.x, rocket.target.y, radius * 0.8, 0xff5400, 0.3).setDepth(1.5);
      this.pools.push({ at: rocket.target, radius: radius * 0.8, timeLeft: burnSeconds, tickTimer: 0, burn, sprite });
    }

    for (let i = this.pools.length - 1; i >= 0; i--) {
      const pool = this.pools[i];
      pool.timeLeft -= dt;
      pool.tickTimer -= dt;
      pool.sprite.setAlpha(0.15 + 0.15 * Math.abs(Math.sin(pool.timeLeft * 6)));
      if (pool.tickTimer <= 0) {
        pool.tickTimer = PlasmiteRpg.BURN_TICK;
        for (const enemy of [...c.enemies]) {
          if (distance(enemy.sprite, pool.at) <= pool.radius + enemy.def.radius) c.damage(enemy, pool.burn);
        }
      }
      if (pool.timeLeft <= 0) {
        pool.sprite.destroy();
        this.pools.splice(i, 1);
      }
    }
  }
}

// ---- Yellow ----

interface BouncingShot {
  sprite: Phaser.GameObjects.Image;
  target: Enemy;
  bouncesLeft: number;
  damage: number;
  hit: Set<Enemy>;
}

/** Shots that ricochet from Lurker to Lurker. Weak per hit; every level adds a bounce. */
export class BeamReflexor extends CooldownWeapon {
  private static readonly SPEED = 760;
  private static readonly BOUNCE_RANGE = 260;
  private shots: BouncingShot[] = [];

  protected baseCooldown(level: number) {
    return weaponStats('beamReflexor', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const [target] = c.nearestEnemies(1, c.player, 600);
    if (!target) return false;
    const { damage, bounces } = weaponStats('beamReflexor', level);
    const sprite = c.scene.add.image(c.player.x, c.player.y, 'reflexBolt').setDepth(FX_DEPTH);
    this.shots.push({ sprite, target, bouncesLeft: bounces + this.mods.extra, damage: this.damage(c, damage), hit: new Set() });
    return true;
  }

  protected override tick(dt: number, c: Combat): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      if (!alive(c, shot.target)) {
        const next = this.nextTarget(c, shot);
        if (!next) {
          this.remove(i);
          continue;
        }
        shot.target = next;
      }
      const target = shot.target.sprite;
      const d = distance(shot.sprite, target);
      shot.sprite.setRotation(angleTo(shot.sprite, target));
      const step = BeamReflexor.SPEED * dt;
      if (d > step + shot.target.def.radius) {
        shot.sprite.x += ((target.x - shot.sprite.x) / d) * step;
        shot.sprite.y += ((target.y - shot.sprite.y) / d) * step;
        continue;
      }
      shot.hit.add(shot.target);
      c.damage(shot.target, shot.damage);
      const next = shot.bouncesLeft > 0 ? this.nextTarget(c, shot) : undefined;
      if (!next) {
        this.remove(i);
        continue;
      }
      shot.bouncesLeft--;
      shot.target = next;
    }
  }

  private nextTarget(c: Combat, shot: BouncingShot): Enemy | undefined {
    return c.nearestEnemies(8, shot.sprite, BeamReflexor.BOUNCE_RANGE).find((e) => !shot.hit.has(e));
  }

  private remove(index: number): void {
    this.shots[index].sprite.destroy();
    this.shots.splice(index, 1);
  }
}

interface Drone {
  sprite: Phaser.GameObjects.Image;
  timeLeft: number;
  fireTimer: number;
  spin: number;
  damage: number;
  fireEvery: number;
}

/** Throws a spinning decoy that sprays shots in every direction and pulls nearby Lurkers towards it. */
export class GyroBurster extends CooldownWeapon {
  private static readonly TAUNT_RADIUS = 240;
  private drones: Drone[] = [];

  protected baseCooldown(level: number) {
    return weaponStats('gyroBurster', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const { damage, seconds, fireEvery } = weaponStats('gyroBurster', level);
    const at = { x: c.player.x + c.aim.x * 110, y: c.player.y + c.aim.y * 110 };
    const sprite = c.scene.add.image(c.player.x, c.player.y, 'gyroDrone').setDepth(FX_DEPTH);
    c.scene.tweens.add({ targets: sprite, x: at.x, y: at.y, duration: 250, ease: 'Cubic.easeOut' });
    this.drones.push({ sprite, timeLeft: seconds, fireTimer: 0.25, spin: 0, damage: this.damage(c, damage), fireEvery });
    c.decoy(at, this.area(c, GyroBurster.TAUNT_RADIUS), seconds);
    return true;
  }

  protected override tick(dt: number, c: Combat): void {
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const drone = this.drones[i];
      drone.timeLeft -= dt;
      drone.sprite.rotation += dt * 9;
      if (drone.timeLeft <= 0) {
        drone.sprite.destroy();
        this.drones.splice(i, 1);
        continue;
      }
      drone.fireTimer -= dt;
      while (drone.fireTimer <= 0) {
        drone.fireTimer += drone.fireEvery;
        drone.spin += 0.45;
        // Two shots on opposite sides, rotating: a spiral of fire
        for (const offset of [0, Math.PI]) {
          c.fire({
            texture: 'bolt', x: drone.sprite.x, y: drone.sprite.y, angle: drone.spin + offset,
            speed: 420, life: 0.8, radius: 6, damage: drone.damage, rotate: true,
          });
        }
      }
    }
  }
}

// ---- Blue ----

interface Needle {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  target?: Enemy;
  life: number;
  damage: number;
}

/** Swarms of fast homing needles. If their target dies they find another. */
export class NeedleLazer extends CooldownWeapon {
  private static readonly SPEED = 560;
  private static readonly TURN = 10;
  private needles: Needle[] = [];

  protected baseCooldown(level: number) {
    return weaponStats('needleLazer', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const { damage, needles } = weaponStats('needleLazer', level);
    const count = needles + this.mods.extra;
    const targets = c.nearestEnemies(count, c.player, 520);
    if (targets.length === 0) return false;
    const aim = aimAngle(c);
    for (let i = 0; i < count; i++) {
      // Launch in a fan, then curve onto the targets
      const angle = aim + (i - (count - 1) / 2) * 0.35;
      this.needles.push({
        sprite: c.scene.add.image(c.player.x, c.player.y, 'needle').setDepth(FX_DEPTH),
        vx: Math.cos(angle) * NeedleLazer.SPEED, vy: Math.sin(angle) * NeedleLazer.SPEED,
        target: targets[i % targets.length], life: 1.8, damage: this.damage(c, damage),
      });
    }
    return true;
  }

  protected override tick(dt: number, c: Combat): void {
    for (let i = this.needles.length - 1; i >= 0; i--) {
      const needle = this.needles[i];
      needle.life -= dt;
      if (!needle.target || !alive(c, needle.target)) [needle.target] = c.nearestEnemies(1, needle.sprite, 400);
      if (needle.target) {
        const want = angleTo(needle.sprite, needle.target.sprite);
        const turn = Math.min(1, NeedleLazer.TURN * dt);
        needle.vx += (Math.cos(want) * NeedleLazer.SPEED - needle.vx) * turn;
        needle.vy += (Math.sin(want) * NeedleLazer.SPEED - needle.vy) * turn;
      }
      needle.sprite.x += needle.vx * dt;
      needle.sprite.y += needle.vy * dt;
      needle.sprite.setRotation(Math.atan2(needle.vy, needle.vx));

      const hit = needle.target && distance(needle.sprite, needle.target.sprite) < needle.target.def.radius + 5;
      if (hit) c.damage(needle.target!, needle.damage);
      if (hit || needle.life <= 0) {
        needle.sprite.destroy();
        this.needles.splice(i, 1);
      }
    }
  }
}

// ---- Dark ----

interface Lift {
  enemies: Enemy[];
  field: Phaser.GameObjects.Arc;
  timeLeft: number;
  damage: number;
  hpShare: number;
}

/** Lifts every Lurker in a field off the ground, helpless, then slams them down for a share of their health. */
export class MassInverter extends CooldownWeapon {
  private static readonly FLOAT_SECONDS = 1.5;
  private lifts: Lift[] = [];

  protected baseCooldown(level: number) {
    return weaponStats('massInverter', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    const center = densestSpot(c, 380);
    if (!center) return false;
    const { damage, radius, hpShare } = weaponStats('massInverter', level);
    const r = this.area(c, radius);
    const enemies = c.enemies.filter((e) => distance(e.sprite, center) <= r + e.def.radius);
    const field = c.scene.add.circle(center.x, center.y, r, 0x7b2cbf, 0.2).setStrokeStyle(3, 0xc77dff, 0.9).setDepth(1.5);
    for (const enemy of enemies) {
      c.stun(enemy, MassInverter.FLOAT_SECONDS);
      if (!enemy.boss) c.scene.tweens.add({ targets: enemy.sprite, scale: 1.35, alpha: 0.7, duration: 300 });
    }
    this.lifts.push({ enemies, field, timeLeft: MassInverter.FLOAT_SECONDS, damage: this.damage(c, damage), hpShare });
    return true;
  }

  protected override tick(dt: number, c: Combat): void {
    for (let i = this.lifts.length - 1; i >= 0; i--) {
      const lift = this.lifts[i];
      lift.timeLeft -= dt;
      if (lift.timeLeft > 0) continue;
      // Slam: a flat hit plus a share of max health, much smaller against bosses
      for (const enemy of lift.enemies) {
        if (!alive(c, enemy)) continue;
        c.scene.tweens.add({ targets: enemy.sprite, scale: 1, alpha: 1, duration: 120 });
        const share = enemy.boss ? lift.hpShare / 4 : lift.hpShare;
        c.damage(enemy, lift.damage + enemy.maxHp * share);
      }
      c.scene.cameras.main.shake(150, 0.006);
      c.scene.tweens.add({ targets: lift.field, scale: 1.2, alpha: 0, duration: 250, onComplete: () => lift.field.destroy() });
      this.lifts.splice(i, 1);
    }
  }
}

/** Charges for a moment, then a huge nova around Jak. Slow, automatic, devastating. */
export class SuperNova extends CooldownWeapon {
  private static readonly CHARGE = 0.6;
  private charging = 0;
  private glow?: Phaser.GameObjects.Arc;
  private pending = { damage: 0, radius: 0 };

  protected baseCooldown(level: number) {
    return weaponStats('superNova', level).cooldown;
  }

  protected trigger(level: number, c: Combat) {
    // Never start a new charge over one in progress: with a cooldown shorter than the charge, the old glow
    // used to be orphaned and stayed on screen forever. Waiting here makes the charge the real minimum cooldown.
    if (this.charging > 0 || c.enemies.length === 0) return false;
    const { damage, radius } = weaponStats('superNova', level);
    this.pending = { damage: this.damage(c, damage), radius: this.area(c, radius) };
    this.charging = SuperNova.CHARGE;
    this.glow = c.scene.add.circle(c.player.x, c.player.y, 30, 0x9d4edd, 0.5).setDepth(FX_DEPTH);
    return true;
  }

  protected override tick(dt: number, c: Combat): void {
    if (this.charging <= 0) return;
    this.charging -= dt;
    this.glow?.setPosition(c.player.x, c.player.y).setScale(1 + (1 - this.charging / SuperNova.CHARGE) * 1.5);
    if (this.charging > 0) return;
    this.glow?.destroy();
    this.glow = undefined;
    c.scene.cameras.main.flash(200, 60, 9, 108);
    c.scene.cameras.main.shake(300, 0.012);
    c.explode(c.player, this.pending.radius, this.pending.damage, 0x3c096c);
  }
}
