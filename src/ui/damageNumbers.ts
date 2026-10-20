import type * as Phaser from 'phaser';
import { FONT } from '../config';

const POOL_SIZE = 70;
const DEPTH = 50;

/**
 * Floating damage numbers from a fixed pool of text objects, so a screen full of hits
 * doesn't create thousands of texts. When every number is in flight, new hits just aren't shown.
 */
export class DamageNumbers {
  private free: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.free.push(scene.add.text(0, 0, '', {
        fontFamily: FONT, fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setStroke('#000000', 4).setDepth(DEPTH).setVisible(false));
    }
  }

  show(x: number, y: number, amount: number, color = '#ffffff', big = false): void {
    const text = this.free.pop();
    if (!text) return;
    text.setText(String(Math.max(1, Math.round(amount))))
      .setColor(color)
      .setFontSize(big ? 22 : 16)
      .setPosition(x + (Math.random() - 0.5) * 16, y - 10)
      .setAlpha(1)
      .setVisible(true);
    this.scene.tweens.add({
      targets: text, y: text.y - 32, duration: 800, ease: 'Cubic.easeOut',
      // Stay fully visible for most of the rise, then fade
      alpha: { from: 1, to: 0, ease: (t: number) => Math.max(0, (t - 0.6) / 0.4) },
      onComplete: () => {
        text.setVisible(false);
        this.free.push(text);
      },
    });
  }
}
