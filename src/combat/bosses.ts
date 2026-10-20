import type { BossId } from '../logic/maps';
import type { EnemyId } from '../logic/waves';
import type { Combat, Enemy, Point } from './types';

/** What a boss can do on top of the weapons' view. Damage values are base, the scene scales them with time. */
export interface BossContext extends Combat {
  readonly elapsed: number;
  spawnMinion(id: EnemyId, at: Point): void;
  /** A regular enemy from the current zone's pool. */
  spawnFromZone(at: Point): void;
  /** Defaults to a dark eco ball. */
  fireHostile(from: Point, angle: number, speed: number, damage: number, texture?: string): void;
  /** Warning circle at `at`, then damage there after `delay` seconds. `from` draws a thrown boulder. */
  hazard(at: Point, radius: number, delay: number, damage: number, from?: Point): void;
}

export interface BossAI {
  update(dt: number, self: Enemy, c: BossContext): void;
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const angleTo = (from: Point, to: Point) => Math.atan2(to.y - from.y, to.x - from.x);

function moveTowards(self: Enemy, target: Point, speed: number, dt: number): void {
  const d = distance(self.sprite, target) || 1;
  self.sprite.x += ((target.x - self.sprite.x) / d) * speed * dt;
  self.sprite.y += ((target.y - self.sprite.y) / d) * speed * dt;
}

/** Calls `action` every `every` seconds. */
class Cooldown {
  private timer: number;

  constructor(private readonly every: number, first = every) {
    this.timer = first;
  }

  tick(dt: number, action: () => void, every = this.every): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer += every;
    action();
  }
}

/** Rooted in place, spits dark eco. Burrows back next to Jak if left behind. */
class DarkEcoPlant implements BossAI {
  private spit = new Cooldown(1.8, 1);
  private reroot = new Cooldown(2);

  update(dt: number, self: Enemy, c: BossContext): void {
    this.spit.tick(dt, () => {
      const aim = angleTo(self.sprite, c.player);
      for (const offset of [-0.2, 0, 0.2]) c.fireHostile(self.sprite, aim + offset, 230, 10);
    });
    this.reroot.tick(dt, () => {
      if (distance(self.sprite, c.player) < 450) return;
      const angle = c.rng() * Math.PI * 2;
      self.sprite.setPosition(c.player.x + Math.cos(angle) * 280, c.player.y + Math.sin(angle) * 280);
      self.sprite.setAlpha(0);
      c.scene.tweens.add({ targets: self.sprite, alpha: 1, duration: 500 });
    });
  }
}

/** Keeps its distance and lobs boulders where Jak is heading. */
class Klaww implements BossAI {
  private throwRock = new Cooldown(2.2, 1.5);

  update(dt: number, self: Enemy, c: BossContext): void {
    const d = distance(self.sprite, c.player);
    // Close enough that shots reach him past the swarm, far enough to make you dodge boulders
    if (d > 330) moveTowards(self, c.player, 100, dt);
    else if (d < 200) moveTowards(self, c.player, -70, dt);
    self.sprite.setFlipX(c.player.x < self.sprite.x);

    this.throwRock.tick(dt, () => {
      const target = { x: c.player.x + c.aim.x * 50, y: c.player.y + c.aim.y * 50 };
      c.hazard(target, 70, 1.1, 28, self.sprite);
    });
  }
}

/** Chases, lunges and hatches swarms of small spiders. */
class GiantSpider implements BossAI {
  private hatch = new Cooldown(6, 2);
  private lunge = new Cooldown(4, 3);
  private lunging = 0;

  update(dt: number, self: Enemy, c: BossContext): void {
    this.lunging = Math.max(0, this.lunging - dt);
    moveTowards(self, c.player, this.lunging > 0 ? 320 : 80, dt);
    self.sprite.setFlipX(c.player.x < self.sprite.x);

    this.lunge.tick(dt, () => {
      this.lunging = 0.4;
    });
    this.hatch.tick(dt, () => {
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        c.spawnMinion('spider', { x: self.sprite.x + Math.cos(angle) * 50, y: self.sprite.y + Math.sin(angle) * 50 });
      }
    });
  }
}

/** Slow and huge: rings of dark eco and Lurker reinforcements, faster once badly damaged. */
class GolMaiaRobot implements BossAI {
  private ring = new Cooldown(3.5, 2);
  private reinforcements = new Cooldown(9, 5);
  private ringOffset = 0;

  update(dt: number, self: Enemy, c: BossContext): void {
    moveTowards(self, c.player, 45, dt);
    const enraged = self.hp < self.maxHp / 2;

    this.ring.tick(dt, () => {
      const shots = enraged ? 18 : 14;
      // Rotate each ring a little so the gaps move and you can't park in one spot
      this.ringOffset += 0.18;
      for (let i = 0; i < shots; i++) {
        c.fireHostile(self.sprite, this.ringOffset + (i / shots) * Math.PI * 2, 190, 14);
      }
    }, enraged ? 2.2 : 3.5);

    this.reinforcements.tick(dt, () => {
      for (let i = 0; i < 6; i++) {
        const angle = c.rng() * Math.PI * 2;
        c.spawnFromZone({ x: self.sprite.x + Math.cos(angle) * 80, y: self.sprite.y + Math.sin(angle) * 80 });
      }
    });
  }
}

/** Circles Jak on his hover bike, then rams straight through where Jak was. Calls in guards. */
class Errol implements BossAI {
  private static readonly ORBIT = 260;
  private ram = new Cooldown(3.2, 2);
  private backup = new Cooldown(10, 6);
  private ramming = 0;
  private ramAngle = 0;
  private orbitAngle = 0;

  update(dt: number, self: Enemy, c: BossContext): void {
    if (this.ramming > 0) {
      this.ramming -= dt;
      self.sprite.x += Math.cos(this.ramAngle) * 520 * dt;
      self.sprite.y += Math.sin(this.ramAngle) * 520 * dt;
    } else {
      this.orbitAngle += dt * 1.2;
      const target = {
        x: c.player.x + Math.cos(this.orbitAngle) * Errol.ORBIT,
        y: c.player.y + Math.sin(this.orbitAngle) * Errol.ORBIT,
      };
      moveTowards(self, target, 220, dt);
    }
    self.sprite.setFlipX(c.player.x < self.sprite.x);

    this.ram.tick(dt, () => {
      this.ramAngle = angleTo(self.sprite, c.player);
      this.ramming = 0.8;
    });
    this.backup.tick(dt, () => {
      for (let i = 0; i < 4; i++) {
        c.spawnMinion(i % 2 ? 'krimzonGuard' : 'guardGunner', { x: self.sprite.x + (i - 1.5) * 40, y: self.sprite.y + 40 });
      }
    });
  }
}

/** Floats slowly on his hover chair, sprays bullets in a fan and calls his hired goons. */
class Krew implements BossAI {
  private spray = new Cooldown(2, 1.5);
  private goons = new Cooldown(7, 4);

  update(dt: number, self: Enemy, c: BossContext): void {
    if (distance(self.sprite, c.player) > 200) moveTowards(self, c.player, 50, dt);
    this.spray.tick(dt, () => {
      const aim = angleTo(self.sprite, c.player);
      for (let i = -2; i <= 2; i++) c.fireHostile(self.sprite, aim + i * 0.18, 260, 11, 'laserBolt');
    });
    this.goons.tick(dt, () => {
      for (let i = 0; i < 3; i++) {
        const angle = c.rng() * Math.PI * 2;
        c.spawnMinion('metalGrunt', { x: self.sprite.x + Math.cos(angle) * 60, y: self.sprite.y + Math.sin(angle) * 60 });
      }
    });
  }
}

/** Walks you down firing bursts, and calls bombing runs on top of you. */
class Praxis implements BossAI {
  private burst = new Cooldown(2.4, 1.5);
  private bombs = new Cooldown(4.5, 3);

  update(dt: number, self: Enemy, c: BossContext): void {
    if (distance(self.sprite, c.player) > 160) moveTowards(self, c.player, 70, dt);
    self.sprite.setFlipX(c.player.x < self.sprite.x);

    this.burst.tick(dt, () => {
      const aim = angleTo(self.sprite, c.player);
      for (const offset of [-0.1, 0, 0.1]) c.fireHostile(self.sprite, aim + offset, 340, 13, 'laserBolt');
    });
    this.bombs.tick(dt, () => {
      for (let i = 0; i < 4; i++) {
        const angle = c.rng() * Math.PI * 2;
        const spread = i === 0 ? 0 : 60 + c.rng() * 60;
        c.hazard({ x: c.player.x + Math.cos(angle) * spread, y: c.player.y + Math.sin(angle) * spread }, 55, 1.2, 24);
      }
    });
  }
}

/** The Metal Head leader: spiral volleys, lunges and endless Metal Heads. Angrier at half health. */
class MetalKor implements BossAI {
  private volley = new Cooldown(0.25, 2);
  private lunge = new Cooldown(5, 4);
  private brood = new Cooldown(8, 5);
  private spiral = 0;
  private lunging = 0;

  update(dt: number, self: Enemy, c: BossContext): void {
    const enraged = self.hp < self.maxHp / 2;
    this.lunging = Math.max(0, this.lunging - dt);
    moveTowards(self, c.player, this.lunging > 0 ? 360 : 55, dt);

    // A rotating stream of shots: one every tick, two arms (three when enraged)
    this.volley.tick(dt, () => {
      this.spiral += 0.35;
      const arms = enraged ? 3 : 2;
      for (let i = 0; i < arms; i++) c.fireHostile(self.sprite, this.spiral + (i / arms) * Math.PI * 2, 170, 12);
    }, enraged ? 0.2 : 0.3);

    this.lunge.tick(dt, () => {
      this.lunging = 0.5;
    });
    this.brood.tick(dt, () => {
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        c.spawnMinion(i % 2 ? 'metalFlitter' : 'metalGrunt', {
          x: self.sprite.x + Math.cos(angle) * 70, y: self.sprite.y + Math.sin(angle) * 70,
        });
      }
    });
  }
}

export function createBossAI(id: BossId): BossAI {
  switch (id) {
    case 'darkEcoPlant': return new DarkEcoPlant();
    case 'klaww': return new Klaww();
    case 'giantSpider': return new GiantSpider();
    case 'golMaiaRobot': return new GolMaiaRobot();
    case 'errol': return new Errol();
    case 'krew': return new Krew();
    case 'praxis': return new Praxis();
    case 'metalKor': return new MetalKor();
  }
}
