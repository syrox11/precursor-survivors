import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, getStorage } from '../config';
import { formatTime, loadBestTime, saveBestTime } from '../logic/records';

export interface RunResult {
  won: boolean;
  time: number;
  kills: number;
  level: number;
  orbs: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(result: RunResult): void {
    const cx = GAME_WIDTH / 2;
    const storage = getStorage();
    const newRecord = saveBestTime(storage, result.time);

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0);
    this.add.text(cx, 120, result.won ? 'POWER CELL ACQUIRED!' : 'JAK HAS FALLEN...', {
      fontFamily: FONT, fontSize: '44px', color: result.won ? COLORS.accent : '#ff6b6b', fontStyle: 'bold',
    }).setOrigin(0.5).setStroke('#1a1a1a', 6);
    this.add.text(cx, 175, result.won ? '"Not bad... for a guy who never talks." - Daxter' : '"Uh, Jak? Jak?! Get up, buddy!" - Daxter', {
      fontFamily: FONT, fontSize: '17px', color: COLORS.text, fontStyle: 'italic',
    }).setOrigin(0.5);

    const lines = [
      `Time survived: ${formatTime(result.time)}${newRecord ? '  (new record!)' : ''}`,
      `Best time: ${formatTime(Math.max(result.time, loadBestTime(storage)))}`,
      `Level reached: ${result.level}`,
      `Lurkers defeated: ${result.kills}`,
      `Precursor orbs: ${result.orbs}`,
    ];
    this.add.text(cx, 290, lines.join('\n'), {
      fontFamily: FONT, fontSize: '20px', color: COLORS.text, align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);

    const retry = this.add.text(cx, 440, 'Press SPACE or click to play again', {
      fontFamily: FONT, fontSize: '22px', color: COLORS.accent, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({ targets: retry, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    // Short delay so a key held down at the moment of death doesn't skip this screen
    this.time.delayedCall(600, () => {
      const restart = () => this.scene.start('Game');
      this.input.keyboard?.once('keydown-SPACE', restart);
      this.input.once('pointerdown', restart);
    });
  }
}
