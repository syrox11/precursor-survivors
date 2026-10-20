import * as Phaser from 'phaser';
import { createCompanion, type Companion, type CompanionContext } from '../combat/companions';
import { createWeapon, type Weapon } from '../combat/weapons';
import type { Combat, Enemy, Point, ProjectileSpec } from '../combat/types';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, getStorage, PLAYER_RADIUS, RUN_DURATION, WORLD_SIZE } from '../config';
import { debugEnabled, debugLoadout, exposeDebug } from '../debug';
import {
  applyItem, ITEMS, ownedOfKind, rollChoices, STARTING_LOADOUT, startingLoadout,
  type ItemId, type Loadout, type WeaponId,
} from '../logic/items';
import { bonusesFor, COMPANIONS, NO_BONUSES, SKINS, type Bonuses } from '../logic/meta';
import { loadSave, type RunSetup } from '../logic/save';
import { formatTime } from '../logic/records';
import { createRng, randomBetween, seedFromQuery, type Rng } from '../logic/rng';
import { computeStats, type PlayerStats } from '../logic/stats';
import { damageMultiplier, hordeSize, hpMultiplier, MAX_ENEMIES, pickEnemy, spawnInterval, type EnemyDef } from '../logic/waves';
import { gainXp, INITIAL_XP, xpToNextLevel, type XpState } from '../logic/xp';
import type { RunResult } from './GameOverScene';
import type { LevelUpData } from './LevelUpScene';

interface Orb {
  sprite: Phaser.GameObjects.Image;
  value: number;
  attracted: boolean;
}

interface Projectile {
  sprite: Phaser.GameObjects.Image;
  spec: ProjectileSpec;
  vx: number;
  vy: number;
  life: number;
  pierceLeft: number;
  /** Enemies already hit, so piercing shots don't hit the same one every frame. */
  hit: Set<Enemy>;
}

const ORB_SPEED = 420;
const KNOCKBACK = 240;
const KNOCKBACK_DECAY = 8;
const SPAWN_DISTANCE = Math.hypot(GAME_WIDTH, GAME_HEIGHT) / 2 + 40;

const DEPTH = { decor: 1, orb: 2, enemy: 3, player: 4, companion: 5, fx: 6, hud: 100 };

export class GameScene extends Phaser.Scene {
  private rng!: Rng;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;

  private setup!: RunSetup;
  private bonuses: Bonuses = NO_BONUSES;
  private rerolls = 0;

  private player!: Phaser.GameObjects.Image;
  private companionSprite!: Phaser.GameObjects.Image;
  private companion!: Companion;
  private companionContext!: CompanionContext;
  private speech?: Phaser.GameObjects.Text;
  private ground!: Phaser.GameObjects.TileSprite;
  private aim: Point = { x: 1, y: 0 };

  private enemies: Enemy[] = [];
  private orbs: Orb[] = [];
  private projectiles: Projectile[] = [];
  private weapons = new Map<WeaponId, Weapon>();
  private combat!: Combat;

  private loadout: Loadout = STARTING_LOADOUT;
  private stats: PlayerStats = computeStats(STARTING_LOADOUT);
  private xp: XpState = INITIAL_XP;
  private hp = 0;
  private hurtFlash = 0;
  private pendingLevelUps = 0;

  private elapsed = 0;
  private kills = 0;
  private orbsCollected = 0;
  private spawnTimer = 0;
  private ended = false;

  private hud!: {
    hpFill: Phaser.GameObjects.Rectangle;
    xpFill: Phaser.GameObjects.Rectangle;
    level: Phaser.GameObjects.Text;
    timer: Phaser.GameObjects.Text;
    counters: Phaser.GameObjects.Text;
    loadout: Phaser.GameObjects.Container;
  };

  constructor() {
    super('Game');
  }

  create(): void {
    const seed = seedFromQuery(window.location.search) ?? Math.floor(Math.random() * 2 ** 32);
    this.rng = createRng(seed);
    const save = loadSave(getStorage());
    this.setup = save.setup;
    this.bonuses = bonusesFor(save.powerUps, this.setup.companion);
    this.rerolls = save.powerUps.reroll ?? 0;
    this.resetState();
    if (debugEnabled(window.location.search)) {
      this.loadout = { ...this.loadout, ...debugLoadout(window.location.search) };
      this.stats = computeStats(this.loadout, this.bonuses);
      this.hp = this.stats.maxHp;
    }

    this.ground = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'sand').setOrigin(0).setScrollFactor(0);
    this.scatterDecor();

    const center = WORLD_SIZE / 2;
    this.player = this.add.image(center, center, SKINS[this.setup.skin].texture).setDepth(DEPTH.player);
    this.companionSprite = this.add.image(center - 14, center - 18, COMPANIONS[this.setup.companion].texture).setDepth(DEPTH.companion);
    this.companion = createCompanion(this.setup.companion);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE).startFollow(this.player, true, 0.15, 0.15);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as typeof this.keys;
    this.combat = this.createCombat();
    this.companionContext = this.createCompanionContext();
    this.syncWeapons();
    this.createHud();

    if (debugEnabled(window.location.search)) {
      exposeDebug(() => ({
        elapsed: this.elapsed,
        hp: this.hp,
        maxHp: this.stats.maxHp,
        level: this.xp.level,
        kills: this.kills,
        player: { x: this.player.x, y: this.player.y },
        enemies: this.enemies.map((e) => ({ x: e.sprite.x, y: e.sprite.y })),
        orbs: this.orbs.map((o) => ({ x: o.sprite.x, y: o.sprite.y })),
        loadout: { ...this.loadout },
        state: this.ended ? 'over' : this.scene.isPaused() ? 'levelUp' : 'playing',
      }));
    }
  }

  update(_time: number, deltaMs: number): void {
    if (this.ended) return;
    // Cap the step so a background tab doesn't teleport everything on return
    const dt = Math.min(deltaMs, 50) / 1000;
    const previous = this.elapsed;
    this.elapsed += dt;

    this.movePlayer(dt);
    this.spawnEnemies(dt, previous);
    this.updateEnemies(dt);
    for (const [id, weapon] of this.weapons) weapon.update(dt, this.loadout[id] ?? 1, this.combat);
    this.companion.update(dt, this.companionContext);
    this.updateProjectiles(dt);
    this.updateOrbs(dt);

    this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.regen * dt);
    this.updateHud();

    if (this.hp <= 0) return this.endRun(false);
    if (this.elapsed >= RUN_DURATION) return this.endRun(true);
    if (this.pendingLevelUps > 0) this.openLevelUp();
  }

  private resetState(): void {
    this.enemies = [];
    this.orbs = [];
    this.projectiles = [];
    this.weapons = new Map();
    this.aim = { x: 1, y: 0 };
    this.speech = undefined;
    this.loadout = startingLoadout(this.setup.weapon);
    this.stats = computeStats(this.loadout, this.bonuses);
    this.xp = INITIAL_XP;
    this.hp = this.stats.maxHp;
    this.hurtFlash = 0;
    this.pendingLevelUps = 0;
    this.elapsed = 0;
    this.kills = 0;
    this.orbsCollected = 0;
    this.spawnTimer = 0;
    this.ended = false;
  }

  /** The view of the game that weapons get. Getters so they always see live values. */
  private createCombat(): Combat {
    const scene = this;
    return {
      scene,
      get player() { return scene.player; },
      get aim() { return scene.aim; },
      get enemies() { return scene.enemies; },
      get stats() { return scene.stats; },
      get rng() { return scene.rng; },
      damage: (enemy, amount, knockFrom) => this.damageEnemy(enemy, amount, knockFrom),
      nearestEnemies: (count, from, maxDistance) => this.nearestEnemies(count, from ?? this.player, maxDistance),
      fire: (spec) => this.fireProjectile(spec),
      explode: (at, radius, damage, color) => this.explode(at, radius, damage, color),
    };
  }

  private createCompanionContext(): CompanionContext {
    const scene = this;
    // Spread copies getters as plain values, so the live ones are re-declared here
    return Object.create(this.combat, {
      elapsed: { get: () => scene.elapsed },
      level: { get: () => scene.xp.level },
      sprite: { get: () => scene.companionSprite },
      say: { value: (text: string) => scene.say(text) },
    }) as CompanionContext;
  }

  /** Speech bubble above the companion for a couple of seconds. */
  private say(text: string): void {
    this.speech?.destroy();
    const bubble = this.add.text(this.companionSprite.x, this.companionSprite.y - 22, text, {
      fontFamily: FONT, fontSize: '14px', color: '#1a1a1a', backgroundColor: '#fff4d6', padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setDepth(DEPTH.hud - 1);
    this.speech = bubble;
    this.time.delayedCall(2200, () => {
      bubble.destroy();
      if (this.speech === bubble) this.speech = undefined;
    });
  }

  /** Creates a runtime weapon for every weapon in the loadout that doesn't have one yet. */
  private syncWeapons(): void {
    for (const id of ownedOfKind(this.loadout, 'weapon') as WeaponId[]) {
      if (!this.weapons.has(id)) this.weapons.set(id, createWeapon(id));
    }
  }

  private scatterDecor(): void {
    for (let i = 0; i < 160; i++) {
      const texture = this.rng() < 0.4 ? 'palm' : 'rock';
      this.add.image(randomBetween(this.rng, 0, WORLD_SIZE), randomBetween(this.rng, 0, WORLD_SIZE), texture)
        .setDepth(DEPTH.decor)
        .setAlpha(0.9);
    }
  }

  private movePlayer(dt: number): void {
    const k = this.keys;
    let dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    if (dx !== 0 || dy !== 0) this.aim = { x: dx, y: dy };

    const step = this.stats.moveSpeed * dt;
    this.player.x = Phaser.Math.Clamp(this.player.x + dx * step, PLAYER_RADIUS, WORLD_SIZE - PLAYER_RADIUS);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy * step, PLAYER_RADIUS, WORLD_SIZE - PLAYER_RADIUS);
    if (dx !== 0) this.player.setFlipX(dx < 0);

    // The companion rides on Jak's shoulder, lagging slightly behind
    const facing = this.player.flipX ? 1 : -1;
    const lerp = Math.min(1, dt * 12);
    this.companionSprite.x += (this.player.x + facing * 14 - this.companionSprite.x) * lerp;
    this.companionSprite.y += (this.player.y - 18 - this.companionSprite.y) * lerp;
    this.companionSprite.setFlipX(this.player.flipX);
    this.speech?.setPosition(this.companionSprite.x, this.companionSprite.y - 22);

    const cam = this.cameras.main;
    this.ground.tilePositionX = cam.scrollX;
    this.ground.tilePositionY = cam.scrollY;

    if (this.hurtFlash > 0) {
      this.hurtFlash -= dt;
      if (this.hurtFlash <= 0) this.player.clearTint();
    }
  }

  private spawnEnemies(dt: number, previous: number): void {
    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0) {
      this.spawnTimer += spawnInterval(this.elapsed);
      if (this.enemies.length < MAX_ENEMIES) {
        this.spawnEnemy(pickEnemy(this.elapsed, this.rng), this.rng() * Math.PI * 2);
      }
    }

    // Every minute a ring of Lurkers closes in from all sides
    const horde = hordeSize(previous, this.elapsed);
    if (horde > 0) {
      const offset = this.rng() * Math.PI * 2;
      for (let i = 0; i < horde; i++) {
        this.spawnEnemy(pickEnemy(this.elapsed, this.rng), offset + (i / horde) * Math.PI * 2);
      }
      this.cameras.main.shake(250, 0.004);
    }
  }

  private spawnEnemy(def: EnemyDef, angle: number): void {
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * SPAWN_DISTANCE, 0, WORLD_SIZE);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * SPAWN_DISTANCE, 0, WORLD_SIZE);
    const sprite = this.add.image(x, y, def.texture).setDepth(DEPTH.enemy);
    this.enemies.push({ sprite, def, hp: def.hp * hpMultiplier(this.elapsed), knockX: 0, knockY: 0, flash: 0 });
  }

  private updateEnemies(dt: number): void {
    let contactDps = 0;
    const decay = Math.exp(-KNOCKBACK_DECAY * dt);
    for (const enemy of this.enemies) {
      const s = enemy.sprite;
      const dx = this.player.x - s.x;
      const dy = this.player.y - s.y;
      const dist = Math.hypot(dx, dy) || 1;
      s.x += ((dx / dist) * enemy.def.speed + enemy.knockX) * dt;
      s.y += ((dy / dist) * enemy.def.speed + enemy.knockY) * dt;
      enemy.knockX *= decay;
      enemy.knockY *= decay;
      s.setFlipX(dx < 0);

      if (enemy.flash > 0) {
        enemy.flash -= dt;
        if (enemy.flash <= 0) s.clearTint();
      }
      if (dist < enemy.def.radius + PLAYER_RADIUS) contactDps += enemy.def.dps;
    }

    if (contactDps > 0) {
      const damage = contactDps * damageMultiplier(this.elapsed) * (1 - this.stats.armor) * dt;
      const taken = this.companion.absorb(damage, this.companionContext);
      this.hp -= taken;
      if (taken > 0 && this.hurtFlash <= 0) {
        this.player.setTint(0xff5555);
        this.hurtFlash = 0.12;
      }
    }
  }

  private nearestEnemies(count: number, from: Point, maxDistance = Infinity): Enemy[] {
    return this.enemies
      .map((enemy) => ({ enemy, dist: Math.hypot(enemy.sprite.x - from.x, enemy.sprite.y - from.y) }))
      .filter((e) => e.dist <= maxDistance)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, count)
      .map((e) => e.enemy);
  }

  private fireProjectile(spec: ProjectileSpec): void {
    const sprite = this.add.image(spec.x, spec.y, spec.texture).setDepth(DEPTH.fx);
    if (spec.rotate) sprite.setRotation(spec.angle);
    this.projectiles.push({
      sprite,
      spec,
      vx: Math.cos(spec.angle) * spec.speed,
      vy: Math.sin(spec.angle) * spec.speed,
      life: spec.life,
      pierceLeft: spec.pierce ?? 0,
      hit: new Set(),
    });
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;

      let done = p.life <= 0;
      for (const enemy of this.enemies) {
        if (done) break;
        if (p.hit.has(enemy)) continue;
        const reach = enemy.def.radius + p.spec.radius;
        const dx = enemy.sprite.x - p.sprite.x;
        const dy = enemy.sprite.y - p.sprite.y;
        if (dx * dx + dy * dy > reach * reach) continue;

        if (p.spec.explosion) {
          done = true;
        } else {
          p.hit.add(enemy);
          this.damageEnemy(enemy, p.spec.damage, p.sprite);
          if (p.pierceLeft-- <= 0) done = true;
        }
      }

      if (done) {
        const blast = p.spec.explosion;
        if (blast) this.explode(p.sprite, blast.radius, blast.damage, blast.color);
        p.sprite.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private explode(at: Point, radius: number, damage: number, color: number): void {
    const { x, y } = at;
    const fx = this.add.circle(x, y, radius, color, 0.45).setDepth(DEPTH.fx).setScale(0.2);
    this.tweens.add({ targets: fx, scale: 1, alpha: 0, duration: 300, onComplete: () => fx.destroy() });
    for (const enemy of [...this.enemies]) {
      if (Math.hypot(enemy.sprite.x - x, enemy.sprite.y - y) <= radius + enemy.def.radius) {
        this.damageEnemy(enemy, damage, { x, y });
      }
    }
  }

  private damageEnemy(enemy: Enemy, amount: number, knockFrom?: Point): void {
    if (!this.enemies.includes(enemy)) return;
    enemy.hp -= amount;
    enemy.sprite.setTint(0xffaaaa);
    enemy.flash = 0.08;
    if (knockFrom) {
      const dx = enemy.sprite.x - knockFrom.x;
      const dy = enemy.sprite.y - knockFrom.y;
      const dist = Math.hypot(dx, dy) || 1;
      enemy.knockX = (dx / dist) * KNOCKBACK;
      enemy.knockY = (dy / dist) * KNOCKBACK;
    }
    if (enemy.hp > 0) return;

    this.enemies.splice(this.enemies.indexOf(enemy), 1);
    this.kills++;
    const { x, y } = enemy.sprite;
    enemy.sprite.destroy();
    const orb = this.add.image(x, y, 'orb').setDepth(DEPTH.orb).setScale(enemy.def.xp > 1 ? 1.3 : 1);
    this.orbs.push({ sprite: orb, value: enemy.def.xp, attracted: false });
  }

  private updateOrbs(dt: number): void {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      const dx = this.player.x - orb.sprite.x;
      const dy = this.player.y - orb.sprite.y;
      const dist = Math.hypot(dx, dy) || 1;
      // Once an orb starts flying it keeps chasing the player
      if (dist < this.stats.pickupRadius) orb.attracted = true;
      if (!orb.attracted) continue;

      if (dist < PLAYER_RADIUS + 6) {
        orb.sprite.destroy();
        this.orbs.splice(i, 1);
        this.collectOrb(orb.value);
        continue;
      }
      const step = Math.min(dist, ORB_SPEED * dt);
      orb.sprite.x += (dx / dist) * step;
      orb.sprite.y += (dy / dist) * step;
    }
  }

  private collectOrb(value: number): void {
    this.orbsCollected += value;
    const result = gainXp(this.xp, value * this.stats.xpMultiplier);
    this.xp = result.state;
    this.pendingLevelUps += result.levelsGained;
  }

  private openLevelUp(): void {
    this.pendingLevelUps--;
    const roll = () => rollChoices(this.loadout, this.rng, this.setup.banned);
    const choices = roll();
    if (choices.length === 0) {
      // Everything maxed: a heal instead of a choice
      this.hp = Math.min(this.stats.maxHp, this.hp + 30);
      return;
    }

    const data: LevelUpData = {
      level: this.xp.level - this.pendingLevelUps,
      choices,
      loadout: this.loadout,
      rerollsLeft: this.rerolls,
      onReroll: () => {
        this.rerolls--;
        return roll();
      },
      onChoose: (id) => {
        this.chooseItem(id);
        this.scene.stop('LevelUp');
        this.scene.resume();
      },
    };
    this.scene.pause();
    this.scene.launch('LevelUp', data);
  }

  private chooseItem(id: ItemId): void {
    const oldMax = this.stats.maxHp;
    this.loadout = applyItem(this.loadout, id);
    this.stats = computeStats(this.loadout, this.bonuses);
    this.syncWeapons();
    // Green eco raises max HP; heal by the same amount so the bar doesn't look emptier
    this.hp += this.stats.maxHp - oldMax;
    this.renderLoadout();
  }

  private endRun(won: boolean): void {
    this.ended = true;
    const result: RunResult = {
      won,
      time: Math.min(this.elapsed, RUN_DURATION),
      kills: this.kills,
      level: this.xp.level,
      orbs: this.orbsCollected,
    };
    this.scene.pause();
    this.scene.launch('GameOver', result);
  }

  private createHud(): void {
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(obj: T) =>
      obj.setScrollFactor(0).setDepth(DEPTH.hud);

    fixed(this.add.rectangle(0, 0, GAME_WIDTH, 10, COLORS.xpBack).setOrigin(0));
    const xpFill = fixed(this.add.rectangle(0, 0, GAME_WIDTH, 10, COLORS.xp).setOrigin(0));

    fixed(this.add.rectangle(16, 22, 204, 18, 0x000000, 0.6).setOrigin(0));
    fixed(this.add.rectangle(18, 24, 200, 14, COLORS.hpBack).setOrigin(0));
    const hpFill = fixed(this.add.rectangle(18, 24, 200, 14, COLORS.hp).setOrigin(0));

    const style = { fontFamily: FONT, fontSize: '18px', color: COLORS.text, fontStyle: 'bold' };
    const level = fixed(this.add.text(16, 46, '', style).setStroke('#000000', 4));
    const timer = fixed(this.add.text(GAME_WIDTH / 2, 20, '', { ...style, fontSize: '26px' }).setOrigin(0.5, 0).setStroke('#000000', 5));
    const counters = fixed(this.add.text(GAME_WIDTH - 16, 22, '', { ...style, align: 'right' }).setOrigin(1, 0).setStroke('#000000', 4));
    const loadout = fixed(this.add.container(16, GAME_HEIGHT - 66));

    this.hud = { hpFill, xpFill, level, timer, counters, loadout };
    this.renderLoadout();
  }

  /** Bottom-left: one row of weapon slots, one of passive slots, with their levels. */
  private renderLoadout(): void {
    const box = this.hud.loadout;
    box.removeAll(true);
    (['weapon', 'passive'] as const).forEach((kind, row) => {
      const owned = ownedOfKind(this.loadout, kind);
      for (let slot = 0; slot < 4; slot++) {
        const x = slot * 30;
        const y = row * 30;
        const id = owned[slot];
        box.add(this.add.rectangle(x, y, 26, 26, 0x000000, 0.55).setOrigin(0).setStrokeStyle(1, 0xffffff, 0.25));
        if (!id) continue;
        box.add(this.add.rectangle(x + 3, y + 3, 20, 20, ITEMS[id].color).setOrigin(0));
        box.add(this.add.text(x + 24, y + 25, String(this.loadout[id]), {
          fontFamily: FONT, fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(1).setStroke('#000000', 3));
      }
    });
  }

  private updateHud(): void {
    this.hud.hpFill.scaleX = Math.max(0, this.hp / this.stats.maxHp);
    this.hud.xpFill.scaleX = this.xp.xp / xpToNextLevel(this.xp.level);
    this.hud.level.setText(`LV ${this.xp.level}`);
    this.hud.timer.setText(formatTime(RUN_DURATION - this.elapsed));
    this.hud.counters.setText(`Lurkers: ${this.kills}\nOrbs: ${this.orbsCollected}`);
  }
}
