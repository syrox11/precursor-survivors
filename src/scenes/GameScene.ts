import * as Phaser from 'phaser';
import { createBossAI, type BossAI, type BossContext } from '../combat/bosses';
import { createCompanion, type Companion, type CompanionContext } from '../combat/companions';
import { HostileSystem } from '../combat/hostiles';
import { createWeapon, type Weapon } from '../combat/weapons';
import type { Combat, Enemy, EnemyStats, Point, ProjectileSpec } from '../combat/types';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, getStorage, PLAYER_RADIUS, RUN_DURATION, WORLD_SIZE } from '../config';
import { debugEnabled, debugGodMode, debugLoadout, debugMap, debugStartTime, exposeDebug } from '../debug';
import {
  applyItem, ITEMS, ownedOfKind, rollChoices, STARTING_LOADOUT, startingLoadout,
  type ItemId, type Loadout, type WeaponId,
} from '../logic/items';
import {
  BOSSES, bossesDue, bossHpMultiplier, bossSpawnTime, groundTexture, MAPS, zoneChanged, zoneIndexAt, type MapDef,
} from '../logic/maps';
import { bonusesFor, COMPANIONS, NO_BONUSES, SKINS, type Bonuses } from '../logic/meta';
import { formatTime } from '../logic/records';
import { createRng, randomBetween, seedFromQuery, type Rng } from '../logic/rng';
import { loadSave, type RunSetup } from '../logic/save';
import { computeStats, type PlayerStats } from '../logic/stats';
import {
  damageMultiplier, ENEMIES, hordeSize, hpMultiplier, MAX_ENEMIES, pickEnemy, spawnInterval, type EnemyDef,
} from '../logic/waves';
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
const BOSS_SPAWN_DISTANCE = 380;
const BOSS_AIM_BIAS = 250;
const CHARGE_EVERY = 3;
const CHARGE_TIME = 0.45;
const CHARGE_SPEED = 3.2;

const DEPTH = { decor: 1, orb: 2, enemy: 3, player: 4, companion: 5, fx: 6, hud: 100 };

export class GameScene extends Phaser.Scene {
  private rng!: Rng;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;

  private setup!: RunSetup;
  private bonuses: Bonuses = NO_BONUSES;
  private rerolls = 0;
  private map: MapDef = MAPS.jak1;
  private zone = 0;

  private player!: Phaser.GameObjects.Image;
  private companionSprite!: Phaser.GameObjects.Image;
  private companion!: Companion;
  private companionContext!: CompanionContext;
  private speech?: Phaser.GameObjects.Text;
  private ground!: Phaser.GameObjects.TileSprite;
  private decor: Phaser.GameObjects.Image[] = [];
  private banner?: Phaser.GameObjects.Container;
  private aim: Point = { x: 1, y: 0 };

  private enemies: Enemy[] = [];
  private orbs: Orb[] = [];
  private projectiles: Projectile[] = [];
  private weapons = new Map<WeaponId, Weapon>();
  private combat!: Combat;
  private hostiles!: HostileSystem;
  private bossContext!: BossContext;
  private bossAI = new Map<Enemy, BossAI>();
  private spawnedBosses = new Set<number>();
  private bossesDefeated = 0;
  private finalBossDefeated = false;

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
  private godMode = false;

  private hud!: {
    hpFill: Phaser.GameObjects.Rectangle;
    xpFill: Phaser.GameObjects.Rectangle;
    level: Phaser.GameObjects.Text;
    timer: Phaser.GameObjects.Text;
    counters: Phaser.GameObjects.Text;
    loadout: Phaser.GameObjects.Container;
    boss: Phaser.GameObjects.Container;
    bossFill: Phaser.GameObjects.Rectangle;
    bossName: Phaser.GameObjects.Text;
  };

  constructor() {
    super('Game');
  }

  create(): void {
    const search = window.location.search;
    const seed = seedFromQuery(search) ?? Math.floor(Math.random() * 2 ** 32);
    this.rng = createRng(seed);
    const save = loadSave(getStorage());
    this.setup = save.setup;
    this.map = MAPS[this.setup.map];
    this.bonuses = bonusesFor(save.powerUps, this.setup.companion);
    this.rerolls = save.powerUps.reroll ?? 0;
    this.resetState();
    if (debugEnabled(search)) {
      this.loadout = { ...this.loadout, ...debugLoadout(search) };
      this.stats = computeStats(this.loadout, this.bonuses);
      this.hp = this.stats.maxHp;
      this.map = MAPS[debugMap(search) ?? this.setup.map];
      this.elapsed = debugStartTime(search);
      this.zone = zoneIndexAt(this.map, this.elapsed);
      this.godMode = debugGodMode(search);
    }

    this.ground = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, groundTexture(this.map.id, this.zone))
      .setOrigin(0)
      .setScrollFactor(0);
    this.scatterDecor();

    const center = WORLD_SIZE / 2;
    this.player = this.add.image(center, center, SKINS[this.setup.skin].texture).setDepth(DEPTH.player);
    this.companionSprite = this.add.image(center - 14, center - 18, COMPANIONS[this.setup.companion].texture).setDepth(DEPTH.companion);
    this.companion = createCompanion(this.setup.companion);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE).startFollow(this.player, true, 0.15, 0.15);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as typeof this.keys;
    this.combat = this.createCombat();
    this.companionContext = this.createCompanionContext();
    this.bossContext = this.createBossContext();
    this.hostiles = new HostileSystem(this, (damage) => this.hurt(damage * damageMultiplier(this.elapsed)));
    this.syncWeapons();
    this.createHud();
    this.showZoneBanner();

    if (debugEnabled(search)) {
      exposeDebug(() => ({
        elapsed: this.elapsed,
        hp: this.hp,
        maxHp: this.stats.maxHp,
        level: this.xp.level,
        kills: this.kills,
        zone: this.zone,
        player: { x: this.player.x, y: this.player.y },
        enemies: this.enemies.map((e) => ({ x: e.sprite.x, y: e.sprite.y })),
        bosses: this.enemies.filter((e) => e.boss).map((e) => ({ name: e.def.name, hp: e.hp, maxHp: e.maxHp })),
        bossesDefeated: this.bossesDefeated,
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
    if (zoneChanged(this.map, previous, this.elapsed)) this.enterZone(zoneIndexAt(this.map, this.elapsed));
    this.spawnBosses(previous);
    this.spawnEnemies(dt, previous);
    this.updateEnemies(dt);
    for (const [id, weapon] of this.weapons) weapon.update(dt, this.loadout[id] ?? 1, this.combat);
    this.companion.update(dt, this.companionContext);
    this.updateProjectiles(dt);
    this.hostiles.update(dt, this.player);
    this.updateOrbs(dt);

    this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.regen * dt);
    this.updateHud();

    if (this.hp <= 0) return this.endRun(false);
    // The Power Cell needs both: the full run time and the final boss down
    if (this.elapsed >= RUN_DURATION && this.finalBossDefeated) return this.endRun(true);
    if (this.pendingLevelUps > 0) this.openLevelUp();
  }

  private resetState(): void {
    this.enemies = [];
    this.orbs = [];
    this.projectiles = [];
    this.decor = [];
    this.banner = undefined;
    this.weapons = new Map();
    this.bossAI = new Map();
    this.spawnedBosses = new Set();
    this.bossesDefeated = 0;
    this.finalBossDefeated = false;
    this.zone = 0;
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
    this.godMode = false;
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

  // Spread would copy the getters as frozen values, so the extended contexts inherit from `combat` instead

  private createCompanionContext(): CompanionContext {
    const scene = this;
    return Object.create(this.combat, {
      elapsed: { get: () => scene.elapsed },
      level: { get: () => scene.xp.level },
      sprite: { get: () => scene.companionSprite },
      say: { value: (text: string) => scene.say(text) },
    }) as CompanionContext;
  }

  private createBossContext(): BossContext {
    const scene = this;
    return Object.create(this.combat, {
      elapsed: { get: () => scene.elapsed },
      spawnMinion: { value: (id: keyof typeof ENEMIES, at: Point) => scene.spawnEnemyAt(ENEMIES[id], at) },
      spawnFromZone: { value: (at: Point) => scene.spawnEnemyAt(scene.pickZoneEnemy(), at) },
      fireHostile: {
        value: (from: Point, angle: number, speed: number, damage: number, texture?: string) =>
          scene.hostiles.fire(from, angle, speed, damage, texture),
      },
      hazard: {
        value: (at: Point, radius: number, delay: number, damage: number, from?: Point) =>
          scene.hostiles.hazard(at, radius, delay, damage, from),
      },
    }) as BossContext;
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

  // ---- Zones ----

  private scatterDecor(): void {
    for (const image of this.decor) image.destroy();
    const textures = this.map.zones[this.zone].decor;
    this.decor = Array.from({ length: 160 }, () =>
      this.add.image(
        randomBetween(this.rng, 0, WORLD_SIZE),
        randomBetween(this.rng, 0, WORLD_SIZE),
        textures[Math.floor(this.rng() * textures.length)],
      ).setDepth(DEPTH.decor).setAlpha(0.9),
    );
  }

  private enterZone(index: number): void {
    this.zone = index;
    this.ground.setTexture(groundTexture(this.map.id, index));
    this.scatterDecor();
    this.cameras.main.flash(500, 255, 244, 214);
    this.showZoneBanner();
  }

  /** Zone name across the top of the screen, plus Daxter's line when he's the companion. */
  private showZoneBanner(): void {
    const zone = this.map.zones[this.zone];
    const daxter = this.setup.companion === 'daxter' || this.setup.companion === 'daxterPants';
    this.showBanner(zone.name.toUpperCase(), daxter ? `"${zone.quote}"` : undefined, COLORS.accent);
  }

  private showBanner(title: string, subtitle: string | undefined, color: string): void {
    this.banner?.destroy();
    const items: Phaser.GameObjects.GameObject[] = [
      this.add.text(0, 0, title, { fontFamily: FONT, fontSize: '34px', color, fontStyle: 'bold' }).setOrigin(0.5).setStroke('#1a1a1a', 6),
    ];
    if (subtitle) {
      items.push(this.add.text(0, 36, subtitle, { fontFamily: FONT, fontSize: '17px', color: COLORS.text, fontStyle: 'italic' })
        .setOrigin(0.5).setStroke('#1a1a1a', 4));
    }
    const banner = this.add.container(GAME_WIDTH / 2, 150, items).setScrollFactor(0).setDepth(DEPTH.hud);
    this.banner = banner;
    this.tweens.add({
      targets: banner, alpha: 0, delay: 2500, duration: 600,
      onComplete: () => {
        banner.destroy();
        if (this.banner === banner) this.banner = undefined;
      },
    });
  }

  // ---- Bosses ----

  private spawnBosses(previous: number): void {
    const due = bossesDue(this.map, previous, this.elapsed);
    // Debug runs can start past the final boss time: it must still show up or the run can't be won
    const last = this.map.zones.length - 1;
    if (this.elapsed >= bossSpawnTime(last) && !this.spawnedBosses.has(last) && !due.includes(last)) due.push(last);
    for (const zone of due) this.spawnBoss(zone);
  }

  private spawnBoss(zone: number): void {
    this.spawnedBosses.add(zone);
    const def = BOSSES[this.map.zones[zone].boss];
    const angle = this.rng() * Math.PI * 2;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * BOSS_SPAWN_DISTANCE, 0, WORLD_SIZE);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * BOSS_SPAWN_DISTANCE, 0, WORLD_SIZE);
    const stats: EnemyStats = { name: def.name, speed: 0, dps: def.dps, radius: def.radius, xp: 0, behavior: 'boss' };
    const hp = def.hp * bossHpMultiplier(this.elapsed);
    const enemy: Enemy = {
      sprite: this.add.image(x, y, def.texture).setDepth(DEPTH.enemy + 0.5),
      def: stats, hp, maxHp: hp, knockX: 0, knockY: 0, flash: 0, timer: 0, dashing: 0,
      boss: { def, zone },
    };
    this.enemies.push(enemy);
    this.bossAI.set(enemy, createBossAI(def.id));
    this.cameras.main.shake(400, 0.006);
    this.showBanner(`BOSS: ${def.name.toUpperCase()}`, undefined, '#ff6b6b');
  }

  private defeatBoss(enemy: Enemy): void {
    const boss = enemy.boss!;
    this.bossAI.delete(enemy);
    this.bossesDefeated++;
    if (boss.zone === this.map.zones.length - 1) this.finalBossDefeated = true;
    // A shower of orbs around where it fell
    for (let i = 0; i < boss.def.orbs; i++) {
      const angle = this.rng() * Math.PI * 2;
      const distance = 20 + this.rng() * 70;
      const sprite = this.add.image(enemy.sprite.x + Math.cos(angle) * distance, enemy.sprite.y + Math.sin(angle) * distance, 'orb')
        .setDepth(DEPTH.orb).setScale(1.3);
      this.orbs.push({ sprite, value: 2, attracted: false });
    }
    this.cameras.main.shake(300, 0.008);
    this.showBanner(`${boss.def.name.toUpperCase()} DEFEATED!`, undefined, COLORS.accent);
  }

  // ---- Player ----

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

  /** Every source of damage to Jak goes through here: armor first, then the companion. */
  private hurt(amount: number): void {
    if (this.godMode) return;
    const taken = this.companion.absorb(amount * (1 - this.stats.armor), this.companionContext);
    this.hp -= taken;
    if (taken > 0 && this.hurtFlash <= 0) {
      this.player.setTint(0xff5555);
      this.hurtFlash = 0.12;
    }
  }

  // ---- Enemies ----

  private pickZoneEnemy(): EnemyDef {
    return pickEnemy(this.map.zones[this.zone].pool, this.elapsed, this.rng);
  }

  private spawnEnemies(dt: number, previous: number): void {
    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0) {
      this.spawnTimer += spawnInterval(this.elapsed);
      this.spawnEnemy(this.pickZoneEnemy(), this.rng() * Math.PI * 2);
    }

    // Every minute a ring of Lurkers closes in from all sides
    const horde = hordeSize(previous, this.elapsed);
    if (horde > 0) {
      const offset = this.rng() * Math.PI * 2;
      for (let i = 0; i < horde; i++) this.spawnEnemy(this.pickZoneEnemy(), offset + (i / horde) * Math.PI * 2);
      this.cameras.main.shake(250, 0.004);
    }
  }

  /** Just outside the visible area, in the direction of `angle`. */
  private spawnEnemy(def: EnemyDef, angle: number): void {
    this.spawnEnemyAt(def, {
      x: this.player.x + Math.cos(angle) * SPAWN_DISTANCE,
      y: this.player.y + Math.sin(angle) * SPAWN_DISTANCE,
    });
  }

  private spawnEnemyAt(def: EnemyDef, at: Point): void {
    if (this.enemies.length >= MAX_ENEMIES) return;
    const x = Phaser.Math.Clamp(at.x, 0, WORLD_SIZE);
    const y = Phaser.Math.Clamp(at.y, 0, WORLD_SIZE);
    const hp = def.hp * hpMultiplier(this.elapsed);
    this.enemies.push({
      sprite: this.add.image(x, y, def.texture).setDepth(DEPTH.enemy),
      def, hp, maxHp: hp, knockX: 0, knockY: 0, flash: 0, dashing: 0,
      // Random start so chargers and zigzaggers don't all move in sync
      timer: this.rng() * CHARGE_EVERY,
    });
  }

  private updateEnemies(dt: number): void {
    let contactDps = 0;
    const decay = Math.exp(-KNOCKBACK_DECAY * dt);
    for (const enemy of this.enemies) {
      const s = enemy.sprite;
      const ai = this.bossAI.get(enemy);
      if (ai) {
        ai.update(dt, enemy, this.bossContext);
      } else {
        this.moveEnemy(enemy, dt, decay);
      }

      if (enemy.flash > 0) {
        enemy.flash -= dt;
        if (enemy.flash <= 0) s.clearTint();
      }
      if (Math.hypot(this.player.x - s.x, this.player.y - s.y) < enemy.def.radius + PLAYER_RADIUS) contactDps += enemy.def.dps;
    }

    if (contactDps > 0) this.hurt(contactDps * damageMultiplier(this.elapsed) * dt);
  }

  private moveEnemy(enemy: Enemy, dt: number, decay: number): void {
    const s = enemy.sprite;
    const dx = this.player.x - s.x;
    const dy = this.player.y - s.y;
    const dist = Math.hypot(dx, dy) || 1;
    let dirX = dx / dist;
    let dirY = dy / dist;
    let speed = enemy.def.speed;
    enemy.timer += dt;

    if (enemy.def.behavior === 'zigzag') {
      // Sideways sway, perpendicular to the direction of Jak
      const sway = Math.sin(enemy.timer * 5) * 0.9;
      dirX -= dy / dist * sway;
      dirY += dx / dist * sway;
    } else if (enemy.def.behavior === 'shooter' && enemy.def.shot) {
      const { range, every, damage } = enemy.def.shot;
      // Hold position at range: back off when Jak gets close, stop once in range
      if (dist < range * 0.75) {
        dirX = -dirX;
        dirY = -dirY;
      } else if (dist < range) {
        speed = 0;
      }
      // Only shoot from roughly on screen, so nothing snipes Jak from the dark
      if (enemy.timer >= every && dist < range * 1.6) {
        enemy.timer = 0;
        this.hostiles.fire(s, Math.atan2(dy, dx), 300, damage, 'laserBolt');
      }
    } else if (enemy.def.behavior === 'charge') {
      if (enemy.dashing > 0) {
        enemy.dashing -= dt;
        speed *= CHARGE_SPEED;
      } else if (enemy.timer >= CHARGE_EVERY) {
        enemy.timer = 0;
        enemy.dashing = CHARGE_TIME;
      }
    }

    s.x += (dirX * speed + enemy.knockX) * dt;
    s.y += (dirY * speed + enemy.knockY) * dt;
    enemy.knockX *= decay;
    enemy.knockY *= decay;
    s.setFlipX(dx < 0);
  }

  /**
   * Closest enemies to `from`. Bosses rank as if BOSS_AIM_BIAS px closer, so auto-aim goes for them
   * instead of spending every shot on the swarm around Jak.
   */
  private nearestEnemies(count: number, from: Point, maxDistance = Infinity): Enemy[] {
    return this.enemies
      .map((enemy) => ({ enemy, dist: Math.hypot(enemy.sprite.x - from.x, enemy.sprite.y - from.y) }))
      .filter((e) => e.dist <= maxDistance)
      .map((e) => ({ ...e, rank: e.enemy.boss ? e.dist - BOSS_AIM_BIAS : e.dist }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, count)
      .map((e) => e.enemy);
  }

  // ---- Jak's attacks ----

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
    // Bosses don't get pushed around
    if (knockFrom && !enemy.boss) {
      const dx = enemy.sprite.x - knockFrom.x;
      const dy = enemy.sprite.y - knockFrom.y;
      const dist = Math.hypot(dx, dy) || 1;
      enemy.knockX = (dx / dist) * KNOCKBACK;
      enemy.knockY = (dy / dist) * KNOCKBACK;
    }
    if (enemy.hp > 0) return;

    this.enemies.splice(this.enemies.indexOf(enemy), 1);
    this.kills++;
    if (enemy.boss) this.defeatBoss(enemy);
    const { x, y } = enemy.sprite;
    enemy.sprite.destroy();
    if (enemy.def.xp > 0) {
      const orb = this.add.image(x, y, 'orb').setDepth(DEPTH.orb).setScale(enemy.def.xp > 1 ? 1.3 : 1);
      this.orbs.push({ sprite: orb, value: enemy.def.xp, attracted: false });
    }
  }

  // ---- Orbs and levels ----

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
    this.banner?.destroy();
    this.speech?.destroy();
    const result: RunResult = {
      map: this.map.id,
      won,
      time: Math.min(this.elapsed, RUN_DURATION),
      kills: this.kills,
      level: this.xp.level,
      bossesDefeated: this.bossesDefeated,
      orbs: this.orbsCollected,
    };
    this.scene.pause();
    this.scene.launch('GameOver', result);
  }

  // ---- HUD ----

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

    // Boss health bar under the timer, hidden while no boss is alive
    const bossName = this.add.text(0, 0, '', { ...style, fontSize: '14px', color: '#ff6b6b' }).setOrigin(0.5, 0).setStroke('#000000', 4);
    const bossBack = this.add.rectangle(-150, 20, 300, 12, 0x000000, 0.6).setOrigin(0);
    const bossFill = this.add.rectangle(-149, 21, 298, 10, 0xe5383b).setOrigin(0);
    const boss = fixed(this.add.container(GAME_WIDTH / 2, 56, [bossName, bossBack, bossFill]).setVisible(false));

    this.hud = { hpFill, xpFill, level, timer, counters, loadout, boss, bossFill, bossName };
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
    const overtime = this.elapsed >= RUN_DURATION && !this.finalBossDefeated;
    this.hud.timer.setText(overtime ? 'DEFEAT THE BOSS!' : formatTime(RUN_DURATION - this.elapsed));
    this.hud.counters.setText(`Lurkers: ${this.kills}\nOrbs: ${this.orbsCollected}`);

    const boss = this.enemies.find((e) => e.boss);
    this.hud.boss.setVisible(!!boss);
    if (boss) {
      this.hud.bossName.setText(boss.def.name);
      this.hud.bossFill.scaleX = Math.max(0, boss.hp / boss.maxHp);
    }
  }
}
