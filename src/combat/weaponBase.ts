import { NEUTRAL_MODS, type WeaponMods } from '../logic/arsenal';
import { effectiveCooldown } from '../logic/weapons';
import type { Combat, Enemy, Point } from './types';

export interface Weapon {
  update(dt: number, level: number, combat: Combat, mods: WeaponMods): void;
}

export const FX_DEPTH = 6;

export const angleTo = (from: Point, to: Point) => Math.atan2(to.y - from.y, to.x - from.x);
export const aimAngle = (c: Combat) => Math.atan2(c.aim.y, c.aim.x);
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const alive = (c: Combat, enemy: Enemy) => c.enemies.includes(enemy);

/**
 * Fires when the cooldown is up. `trigger` returns false when there was nothing to shoot at.
 * `tick` runs every frame for anything a weapon keeps doing after firing (rockets, drones, waves...).
 * Damage, area and cooldown always go through the player's stats and this weapon's mods.
 */
export abstract class CooldownWeapon implements Weapon {
  private timer = 0;
  protected mods: WeaponMods = NEUTRAL_MODS;

  update(dt: number, level: number, c: Combat, mods: WeaponMods): void {
    this.mods = mods;
    this.tick(dt, c);
    this.timer -= dt;
    if (this.timer > 0) return;
    if (this.trigger(level, c)) {
      this.timer = effectiveCooldown(this.baseCooldown(level), c.stats.cooldownMultiplier * mods.cooldown);
    }
  }

  protected tick(_dt: number, _c: Combat): void {}

  protected damage(c: Combat, base: number): number {
    return base * c.stats.damageMultiplier * this.mods.damage;
  }

  protected area(c: Combat, base: number): number {
    return base * c.stats.areaMultiplier * this.mods.area;
  }

  protected abstract baseCooldown(level: number): number;
  protected abstract trigger(level: number, c: Combat): boolean;
}

/** The point with the most enemies around it, among those close to Jak. */
export function densestSpot(c: Combat, range: number, cluster = 100): Point | undefined {
  const candidates = c.nearestEnemies(25, c.player, range);
  let best: Enemy | undefined;
  let bestCount = -1;
  for (const enemy of candidates) {
    const count = candidates.filter((other) => distance(other.sprite, enemy.sprite) < cluster).length;
    if (count > bestCount) {
      best = enemy;
      bestCount = count;
    }
  }
  return best && { x: best.sprite.x, y: best.sprite.y };
}
