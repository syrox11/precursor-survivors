import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, getStorage } from '../config';
import { formatTime, loadBestTime } from '../logic/records';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'sand').setOrigin(0).setAlpha(0.25);

    this.add.text(cx, 130, 'PRECURSOR SURVIVORS', { fontFamily: FONT, fontSize: '52px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#3a2a10', 8);
    this.add.text(cx, 185, 'Survive the Lurker horde for 10 minutes to earn a Power Cell', {
      fontFamily: FONT, fontSize: '18px', color: COLORS.text,
    }).setOrigin(0.5);

    this.add.image(cx - 20, 270, 'jak').setScale(2.5);
    this.add.image(cx + 25, 255, 'daxter').setScale(2.5);

    const best = loadBestTime(getStorage());
    if (best > 0) {
      this.add.text(cx, 340, `Best time: ${formatTime(best)}`, { fontFamily: FONT, fontSize: '18px', color: COLORS.accent })
        .setOrigin(0.5);
    }

    const start = this.add.text(cx, 390, 'Press SPACE or click to start', {
      fontFamily: FONT, fontSize: '24px', color: COLORS.text, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.add.text(cx, 430, 'Move: WASD / arrow keys   ·   Attacks are automatic', {
      fontFamily: FONT, fontSize: '15px', color: COLORS.text,
    }).setOrigin(0.5).setAlpha(0.8);

    this.add.text(cx, GAME_HEIGHT - 20, 'Fan project, not affiliated with or endorsed by Sony Interactive Entertainment or Naughty Dog.', {
      fontFamily: FONT, fontSize: '12px', color: COLORS.text,
    }).setOrigin(0.5).setAlpha(0.6);

    const begin = () => this.scene.start('Game');
    this.input.keyboard?.once('keydown-SPACE', begin);
    this.input.once('pointerdown', begin);
  }
}
