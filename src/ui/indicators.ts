import type * as Phaser from 'phaser';
import type { Point } from '../combat/types';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export interface IndicatorTarget extends Point {
  color: number;
}

/** Box the arrows sit on, kept clear of the timer and boss bar at the top. */
const BOX = { left: 30, right: GAME_WIDTH - 30, top: 92, bottom: GAME_HEIGHT - 30 };
const SIZE = 12;

/** Arrows on the screen edge pointing at off-screen things worth walking to (characters, oracles). */
export class Indicators {
  private graphics: Phaser.GameObjects.Graphics;

  /** `layer` is the screen-fixed container the arrows are drawn in. */
  constructor(layer: Phaser.GameObjects.Container) {
    this.graphics = layer.scene.add.graphics();
    layer.add(this.graphics);
  }

  update(camera: Phaser.Cameras.Scene2D.Camera, targets: readonly IndicatorTarget[]): void {
    const g = this.graphics;
    g.clear();
    const cx = (BOX.left + BOX.right) / 2;
    const cy = (BOX.top + BOX.bottom) / 2;
    const halfW = (BOX.right - BOX.left) / 2;
    const halfH = (BOX.bottom - BOX.top) / 2;
    for (const target of targets) {
      const sx = target.x - camera.worldView.x;
      const sy = target.y - camera.worldView.y;
      if (sx > 0 && sx < GAME_WIDTH && sy > 0 && sy < GAME_HEIGHT) continue;

      // Walk from the box centre towards the target until hitting the box edge
      const angle = Math.atan2(sy - cy, sx - cx);
      const scale = Math.min(
        Math.abs(halfW / (Math.cos(angle) || 1e-6)),
        Math.abs(halfH / (Math.sin(angle) || 1e-6)),
      );
      const x = cx + Math.cos(angle) * scale;
      const y = cy + Math.sin(angle) * scale;
      const tip = (offset: number, length: number) => ({
        x: x + Math.cos(angle + offset) * length,
        y: y + Math.sin(angle + offset) * length,
      });
      const a = tip(0, SIZE);
      const b = tip(2.5, SIZE);
      const c = tip(-2.5, SIZE);
      g.fillStyle(0x000000, 0.5).fillCircle(x, y, SIZE + 3);
      g.fillStyle(target.color, 1).fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
    }
  }
}
