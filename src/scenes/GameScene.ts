import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, PLAYER_RADIUS, RUN_DURATION, WORLD_SIZE } from '../config';
import { createRng, randomBetween, seedFromQuery, type Rng } from '../logic/rng';
import { computeStats, type PlayerStats } from '../logic/stats';
import { applyUpgrade, rollChoices, STARTING_LEVELS, type UpgradeId, type UpgradeLevels } from '../logic/upgrades';
import { hpMultiplier, MAX_ENEMIES, pickEnemy, spawnInterval, type EnemyDef } from '../logic/waves';
import { gainXp, INITIAL_XP, xpToNextLevel, type XpState } from '../logic/xp';
import { formatTime } from '../logic/records';
import type { LevelUpData } from './LevelUpScene';
import type { RunResult } from './GameOverScene';

interface Enemy {
  sprite: Phaser.GameObjects.Image;
  def: EnemyDef;
  hp: number;
  knockX: number;
  knockY: number;
  flash: number;
}

interface Orb {
  sprite: Phaser.GameObjects.Image;
  value: number;
  attracted: boolean;
}

interface Blast {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  damage: number;
}

const ORB_SPEED = 420;
const BLAST_SPEED = 420;
const BLAST_LIFE = 1.4;
const BLAST_RADIUS = 7;
const KNOCKBACK = 240;
const KNOCKBACK_DECAY = 8;

const DEPTH = { decor: 1, orb: 2, enemy: 3, player: 4, daxter: 5, fx: 6, hud: 100 };

export class GameScene extends Phaser.Scene {
  private rng!: Rng;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;

  private player!: Phaser.GameObjects.Image;
  private daxter!: Phaser.GameObjects.Image;
  private ground!: Phaser.GameObjects.TileSprite;

  private enemies: Enemy[] = [];
  private orbs: Orb[] = [];
  private blasts: Blast[] = [];

  private levels: UpgradeLevels = STARTING_LEVELS;
  private stats: PlayerStats = computeStats(STARTING_LEVELS);
  private xp: XpState = INITIAL_XP;
  private hp = 0;
  private hurtFlash = 0;
  private pendingLevelUps = 0;

  private elapsed = 0;
  private kills = 0;
  private orbsCollected = 0;
  private spawnTimer = 0;
  private spinTimer = 0;
  private blastTimer = 0;
  private ended = false;

  private hud!: {
    hpFill: Phaser.GameObjects.Rectangle;
    xpFill: Phaser.GameObjects.Rectangle;
    level: Phaser.GameObjects.Text;
    timer: Phaser.GameObjects.Text;
    counters: Phaser.GameObjects.Text;
  };

  constructor() {
    super('Game');
  }

  create(): void {
    this.resetState();

    const seed = seedFromQuery(window.location.search) ?? Math.floor(Math.random() * 2 ** 32);
    this.rng = createRng(seed);

    this.ground = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'sand').setOrigin(0).setScrollFactor(0);
    this.scatterDecor();

    const center = WORLD_SIZE / 2;
    this.player = this.add.image(center, center, 'jak').setDepth(DEPTH.player);
    this.daxter = this.add.image(center - 14, center - 18, 'daxter').setDepth(DEPTH.daxter);

    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE).startFollow(this.player, true, 0.15, 0.15);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as typeof this.keys;
    this.createHud();
  }

  update(_time: number, deltaMs: number): void {
    if (this.ended) return;
    // Cap the step so a background tab doesn't teleport everything on return
    const dt = Math.min(deltaMs, 50) / 1000;
    this.elapsed += dt;

    this.movePlayer(dt);
    this.spawnEnemies(dt);
    this.updateEnemies(dt);
    this.updateSpin(dt);
    this.updateBlasts(dt);
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
    this.blasts = [];
    this.levels = STARTING_LEVELS;
    this.stats = computeStats(this.levels);
    this.xp = INITIAL_XP;
    this.hp = this.stats.maxHp;
    this.hurtFlash = 0;
    this.pendingLevelUps = 0;
    this.elapsed = 0;
    this.kills = 0;
    this.orbsCollected = 0;
    this.spawnTimer = 0;
    this.spinTimer = this.stats.spin.cooldown;
    this.blastTimer = 0;
    this.ended = false;
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
    const step = this.stats.moveSpeed * dt;
    this.player.x = Phaser.Math.Clamp(this.player.x + dx * step, PLAYER_RADIUS, WORLD_SIZE - PLAYER_RADIUS);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy * step, PLAYER_RADIUS, WORLD_SIZE - PLAYER_RADIUS);
    if (dx !== 0) this.player.setFlipX(dx < 0);

    // Daxter rides on Jak's shoulder, lagging slightly behind
    const facing = this.player.flipX ? 1 : -1;
    const lerp = Math.min(1, dt * 12);
    this.daxter.x += (this.player.x + facing * 14 - this.daxter.x) * lerp;
    this.daxter.y += (this.player.y - 18 - this.daxter.y) * lerp;
    this.daxter.setFlipX(this.player.flipX);

    const cam = this.cameras.main;
    this.ground.tilePositionX = cam.scrollX;
    this.ground.tilePositionY = cam.scrollY;

    if (this.hurtFlash > 0) {
      this.hurtFlash -= dt;
      if (this.hurtFlash <= 0) this.player.clearTint();
    }
  }

  private spawnEnemies(dt: number): void {
    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0) {
      this.spawnTimer += spawnInterval(this.elapsed);
      if (this.enemies.length >= MAX_ENEMIES) continue;
      this.spawnEnemy(pickEnemy(this.elapsed, this.rng));
    }
  }

  private spawnEnemy(def: EnemyDef): void {
    // Just outside the visible area, in a random direction
    const angle = this.rng() * Math.PI * 2;
    const distance = Math.hypot(GAME_WIDTH, GAME_HEIGHT) / 2 + 40;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, 0, WORLD_SIZE);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, 0, WORLD_SIZE);
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
      this.hp -= contactDps * dt;
      if (this.hurtFlash <= 0) {
        this.player.setTint(0xff5555);
        this.hurtFlash = 0.12;
      }
    }
  }

  private updateSpin(dt: number): void {
    this.spinTimer -= dt;
    if (this.spinTimer > 0) return;
    const { radius, cooldown, damage } = this.stats.spin;
    this.spinTimer += cooldown;

    const ring = this.add.circle(this.player.x, this.player.y, radius)
      .setStrokeStyle(4, 0x7fd8ff, 0.9)
      .setDepth(DEPTH.fx)
      .setScale(0.3);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 250, onComplete: () => ring.destroy() });

    for (const enemy of [...this.enemies]) {
      const dx = enemy.sprite.x - this.player.x;
      const dy = enemy.sprite.y - this.player.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist <= radius + enemy.def.radius) {
        enemy.knockX = (dx / dist) * KNOCKBACK;
        enemy.knockY = (dy / dist) * KNOCKBACK;
        this.damageEnemy(enemy, damage * this.stats.damageMultiplier);
      }
    }
  }

  private updateBlasts(dt: number): void {
    const blast = this.stats.blast;
    if (blast) {
      this.blastTimer -= dt;
      if (this.blastTimer <= 0 && this.enemies.length > 0) {
        this.blastTimer = blast.cooldown;
        this.fireBlasts(blast.count, blast.damage * this.stats.damageMultiplier);
      }
    }

    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i];
      b.life -= dt;
      b.sprite.x += b.vx * dt;
      b.sprite.y += b.vy * dt;
      const hit = this.enemies.find(
        (e) => Math.hypot(e.sprite.x - b.sprite.x, e.sprite.y - b.sprite.y) < e.def.radius + BLAST_RADIUS,
      );
      if (hit) this.damageEnemy(hit, b.damage);
      if (hit || b.life <= 0) {
        b.sprite.destroy();
        this.blasts.splice(i, 1);
      }
    }
  }

  /** One blast per target, aimed at the closest enemies first. */
  private fireBlasts(count: number, damage: number): void {
    const targets = [...this.enemies]
      .sort((a, b) => this.distanceToPlayer(a.sprite) - this.distanceToPlayer(b.sprite))
      .slice(0, count);
    for (let i = 0; i < count; i++) {
      const target = targets[i % targets.length].sprite;
      // Extra blasts on the same target fan out a little
      const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x) + (i >= targets.length ? (i - targets.length + 1) * 0.25 : 0);
      const sprite = this.add.image(this.player.x, this.player.y, 'blast').setDepth(DEPTH.fx);
      this.blasts.push({ sprite, vx: Math.cos(angle) * BLAST_SPEED, vy: Math.sin(angle) * BLAST_SPEED, life: BLAST_LIFE, damage });
    }
  }

  private damageEnemy(enemy: Enemy, amount: number): void {
    enemy.hp -= amount;
    enemy.sprite.setTint(0xffaaaa);
    enemy.flash = 0.08;
    if (enemy.hp > 0) return;

    const index = this.enemies.indexOf(enemy);
    if (index === -1) return;
    this.enemies.splice(index, 1);
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
    const result = gainXp(this.xp, value);
    this.xp = result.state;
    this.pendingLevelUps += result.levelsGained;
  }

  private openLevelUp(): void {
    this.pendingLevelUps--;
    const choices = rollChoices(this.levels, this.rng);
    if (choices.length === 0) {
      // Everything maxed: a heal instead of a choice
      this.hp = Math.min(this.stats.maxHp, this.hp + 30);
      return;
    }

    const data: LevelUpData = {
      level: this.xp.level - this.pendingLevelUps,
      choices,
      levels: this.levels,
      onChoose: (id) => {
        this.chooseUpgrade(id);
        this.scene.stop('LevelUp');
        this.scene.resume();
      },
    };
    this.scene.pause();
    this.scene.launch('LevelUp', data);
  }

  private chooseUpgrade(id: UpgradeId): void {
    const oldMax = this.stats.maxHp;
    this.levels = applyUpgrade(this.levels, id);
    this.stats = computeStats(this.levels);
    // Green eco raises max HP; heal by the same amount so the bar doesn't look emptier
    this.hp += this.stats.maxHp - oldMax;
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

  private distanceToPlayer(sprite: Phaser.GameObjects.Image): number {
    return Math.hypot(sprite.x - this.player.x, sprite.y - this.player.y);
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

    this.hud = { hpFill, xpFill, level, timer, counters };
  }

  private updateHud(): void {
    this.hud.hpFill.scaleX = Math.max(0, this.hp / this.stats.maxHp);
    this.hud.xpFill.scaleX = this.xp.xp / xpToNextLevel(this.xp.level);
    this.hud.level.setText(`LV ${this.xp.level}`);
    this.hud.timer.setText(formatTime(RUN_DURATION - this.elapsed));
    this.hud.counters.setText(`Lurkers: ${this.kills}\nOrbs: ${this.orbsCollected}`);
  }
}

