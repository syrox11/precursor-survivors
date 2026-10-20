import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, getStorage } from '../config';
import { CHALLENGES, type RunSummary } from '../logic/meta';
import { formatTime } from '../logic/records';
import { loadSave, recordRun, writeSave } from '../logic/save';
import { addButton } from '../ui/button';

export interface RunResult extends RunSummary {
  orbs: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(result: RunResult): void {
    const cx = GAME_WIDTH / 2;
    const storage = getStorage();
    const reward = recordRun(loadSave(storage), result);
    writeSave(storage, reward.save);

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72).setOrigin(0);
    this.add.text(cx, 70, result.won ? 'POWER CELL ACQUIRED!' : 'JAK HAS FALLEN...', {
      fontFamily: FONT, fontSize: '44px', color: result.won ? COLORS.accent : '#ff6b6b', fontStyle: 'bold',
    }).setOrigin(0.5).setStroke('#1a1a1a', 6);
    this.add.text(cx, 120, result.won ? '"Not bad... for a guy who never talks." - Daxter' : '"Uh, Jak? Jak?! Get up, buddy!" - Daxter', {
      fontFamily: FONT, fontSize: '17px', color: COLORS.text, fontStyle: 'italic',
    }).setOrigin(0.5);

    const lines = [
      `Time survived: ${formatTime(result.time)}${reward.newRecord ? '  (new record!)' : ''}`,
      `Best time: ${formatTime(reward.save.bestTime)}`,
      `Level reached: ${result.level}`,
      `Lurkers defeated: ${result.kills}`,
      `Precursor orbs: ${result.orbs}`,
    ];
    this.add.text(cx, 225, lines.join('\n'), {
      fontFamily: FONT, fontSize: '19px', color: COLORS.text, align: 'center', lineSpacing: 8,
    }).setOrigin(0.5);

    const rewards = [`+${reward.earned} Precursor batteries  (total ${reward.save.batteries})`];
    for (const id of reward.completed) {
      const challenge = CHALLENGES[id];
      const skin = challenge.unlocksSkin ? ' and a new skin' : '';
      rewards.push(`Challenge complete: ${challenge.name}! +${challenge.reward} batteries${skin}`);
    }
    this.add.text(cx, 355, rewards.join('\n'), {
      fontFamily: FONT, fontSize: '18px', color: COLORS.accent, align: 'center', fontStyle: 'bold', lineSpacing: 6,
    }).setOrigin(0.5);

    // Short delay so a key held down at the moment of death doesn't skip this screen
    this.time.delayedCall(600, () => {
      addButton(this, cx - 120, 460, 'PLAY AGAIN', () => this.scene.start('Game'), { width: 210 });
      addButton(this, cx + 120, 460, 'MENU', () => {
        this.scene.stop('Game');
        this.scene.start('Title');
      }, { width: 210, color: 0x4cc9f0 });
      this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('Game'));
    });
  }
}
