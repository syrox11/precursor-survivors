import type { Combat, Enemy, Point } from './types';

/** Dark Jak's damaging abilities. `scale` grows with the run so they stay strong late on. */

const FX_DEPTH = 7;
const DARK = 0x7b2cbf;
const DARK_LIGHT = 0xe0aaff;

export const DARK_BOMB_RADIUS = 360;
const DARK_STRIKE_LENGTH = 800;
const DARK_STRIKE_WIDTH = 110;

/** Wipes regular enemies in a huge radius and takes a quarter of any boss's health. */
export function darkBomb(c: Combat, at: Point, scale: number): void {
  const blast = c.scene.add.circle(at.x, at.y, DARK_BOMB_RADIUS, DARK, 0.55).setDepth(FX_DEPTH).setScale(0.05);
  const ring = c.scene.add.circle(at.x, at.y, DARK_BOMB_RADIUS).setStrokeStyle(8, DARK_LIGHT, 1).setDepth(FX_DEPTH).setScale(0.05);
  c.scene.tweens.add({ targets: [blast, ring], scale: 1, duration: 350, ease: 'Cubic.easeOut' });
  c.scene.tweens.add({ targets: [blast, ring], alpha: 0, delay: 300, duration: 500, onComplete: () => {
    blast.destroy();
    ring.destroy();
  } });
  c.scene.cameras.main.shake(500, 0.02);
  c.scene.cameras.main.flash(300, 123, 44, 191);

  for (const enemy of [...c.enemies]) {
    if (Math.hypot(enemy.sprite.x - at.x, enemy.sprite.y - at.y) > DARK_BOMB_RADIUS + enemy.def.radius) continue;
    c.damage(enemy, enemy.boss ? enemy.maxHp * 0.25 : Math.max(enemy.hp, 200 * scale), at);
  }
}

/** One tick of Dark Blast: lightning from a random enemy near Jak, jumping to its neighbours. */
export function darkBlastTick(c: Combat, scale: number): void {
  const nearby = c.nearestEnemies(20, c.player, 450);
  if (nearby.length === 0) return;
  const chain: Enemy[] = [nearby[Math.floor(c.rng() * nearby.length)]];
  while (chain.length < 5) {
    const last = chain[chain.length - 1].sprite;
    const next = c.nearestEnemies(chain.length + 1, last, 160).find((e) => !chain.includes(e));
    if (!next) break;
    chain.push(next);
  }

  const g = c.scene.add.graphics().setDepth(FX_DEPTH);
  g.lineStyle(4, DARK_LIGHT, 1);
  g.beginPath();
  g.moveTo(chain[0].sprite.x, chain[0].sprite.y - 60);
  for (const enemy of chain) {
    g.lineTo(enemy.sprite.x + (Math.random() - 0.5) * 14, enemy.sprite.y + (Math.random() - 0.5) * 14);
  }
  g.strokePath();
  c.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  for (const enemy of chain) c.damage(enemy, 18 * scale);
}

/** A wide wave from Jak in `angle`, hitting everything along it. */
export function darkStrike(c: Combat, angle: number, scale: number): void {
  const { x, y } = c.player;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const beam = c.scene.add.rectangle(x, y, DARK_STRIKE_LENGTH, DARK_STRIKE_WIDTH, DARK, 0.6)
    .setOrigin(0, 0.5)
    .setRotation(angle)
    .setStrokeStyle(4, DARK_LIGHT, 1)
    .setDepth(FX_DEPTH)
    .setScale(0.1, 1);
  c.scene.tweens.add({ targets: beam, scaleX: 1, duration: 180, ease: 'Cubic.easeOut' });
  c.scene.tweens.add({ targets: beam, alpha: 0, scaleY: 0.2, delay: 200, duration: 350, onComplete: () => beam.destroy() });
  c.scene.cameras.main.shake(250, 0.01);

  for (const enemy of [...c.enemies]) {
    // Distance from the enemy to the beam's centre line, and how far along the beam it is
    const ex = enemy.sprite.x - x;
    const ey = enemy.sprite.y - y;
    const along = ex * dx + ey * dy;
    const across = Math.abs(ex * dy - ey * dx);
    if (along < 0 || along > DARK_STRIKE_LENGTH || across > DARK_STRIKE_WIDTH / 2 + enemy.def.radius) continue;
    c.damage(enemy, enemy.boss ? 120 * scale : Math.max(enemy.hp, 90 * scale), c.player);
  }
}
