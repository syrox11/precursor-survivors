import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, getStorage } from '../config';
import { COMPANIONS, SKINS } from '../logic/meta';
import { formatTime } from '../logic/records';
import { debugUnlockAll } from '../debug';
import { loadSave, unlockEverything, writeSave } from '../logic/save';
import { addButton } from '../ui/button';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    if (debugUnlockAll(window.location.search)) writeSave(getStorage(), unlockEverything(loadSave(getStorage())));
    const save = loadSave(getStorage());
    const cx = GAME_WIDTH / 2;
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'sand').setOrigin(0).setAlpha(0.25);

    this.add.text(cx, 110, 'PRECURSOR SURVIVORS', { fontFamily: FONT, fontSize: '52px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#3a2a10', 8);
    this.add.text(cx, 165, 'Survive 10 minutes and defeat the final boss to earn a Power Cell', {
      fontFamily: FONT, fontSize: '18px', color: COLORS.text,
    }).setOrigin(0.5);

    this.add.image(cx - 20, 250, SKINS[save.setup.skin].texture).setScale(2.5);
    this.add.image(cx + 28, 232, COMPANIONS[save.setup.companion].texture).setScale(2.5);

    const info = [`Precursor batteries: ${save.batteries}`];
    if (save.bestTime > 0) info.push(`Best time: ${formatTime(save.bestTime)}`);
    this.add.text(cx, 325, info.join('     '), { fontFamily: FONT, fontSize: '17px', color: COLORS.accent }).setOrigin(0.5);

    addButton(this, cx - 115, 385, 'PLAY', () => this.scene.start('Setup'), { width: 200 });
    addButton(this, cx + 115, 385, 'SHOP', () => this.scene.start('Shop'), { width: 200, color: 0x4cc9f0 });

    this.add.text(cx, 445, [
      'SPACE to play   ·   Move: WASD / arrow keys   ·   Attacks are automatic',
      'E / Q: Light / Dark Jak when the meter is full   ·   1 - 4: their powers   ·   ESC / P: pause',
    ].join('\n'), {
      fontFamily: FONT, fontSize: '15px', color: COLORS.text, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5).setAlpha(0.8);

    this.add.text(cx, GAME_HEIGHT - 20, 'Fan project, not affiliated with or endorsed by Sony Interactive Entertainment or Naughty Dog.', {
      fontFamily: FONT, fontSize: '12px', color: COLORS.text,
    }).setOrigin(0.5).setAlpha(0.6);

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('Setup'));
  }
}
