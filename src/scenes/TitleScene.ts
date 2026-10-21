import * as Phaser from 'phaser';
import { audio } from '../audio/director';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, getStorage } from '../config';
import { COMPANIONS, SKINS } from '../logic/meta';
import { formatTime } from '../logic/records';
import { debugUnlockAll } from '../debug';
import { loadSave, unlockEverything, writeSave } from '../logic/save';
import { addButton } from '../ui/button';
import { logoFont, refreshTheme } from '../ui/theme';
import { fitCamera } from '../render';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    fitCamera(this);
    if (debugUnlockAll(window.location.search)) writeSave(getStorage(), unlockEverything(loadSave(getStorage())));
    const save = loadSave(getStorage());
    const look = refreshTheme();
    audio.menuMusic();
    const cx = GAME_WIDTH / 2;
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, look.background).setOrigin(0).setAlpha(look.backgroundAlpha + 0.05);

    this.add.text(cx, 110, 'PRECURSOR SURVIVORS', { fontFamily: logoFont(), fontSize: '52px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke(COLORS.stroke, 8);
    this.add.text(cx, 165, 'Survive 10 minutes and defeat the final boss to earn a Power Cell', {
      fontFamily: FONT, fontSize: '18px', color: COLORS.text,
    }).setOrigin(0.5);

    this.add.image(cx - 20, 250, SKINS[save.setup.skin].texture).setScale(2.5);
    this.add.image(cx + 28, 232, COMPANIONS[save.setup.companion].texture).setScale(2.5);

    const info = [`Precursor batteries: ${save.batteries}`];
    if (save.bestTime > 0) info.push(`Best time: ${formatTime(save.bestTime)}`);
    this.add.text(cx, 325, info.join('     '), { fontFamily: FONT, fontSize: '17px', color: COLORS.accent }).setOrigin(0.5);

    addButton(this, cx - 220, 385, 'PLAY', () => this.scene.start('Setup'), { width: 190 });
    addButton(this, cx, 385, 'SHOP', () => this.scene.start('Shop'), { width: 190, variant: 'secondary', sound: 'uiOpen' });
    addButton(this, cx + 220, 385, 'OPTIONS', () => this.scene.start('Options', { from: 'Title' }), {
      width: 190, variant: 'back', sound: 'uiOpen',
    });

    this.add.text(cx, 445, [
      'SPACE to play   ·   Move: WASD / arrow keys   ·   Attacks are automatic',
      'E / Q: Light / Dark Jak when the meter is full   ·   1 - 4: their powers   ·   ESC / P: pause',
    ].join('\n'), {
      fontFamily: FONT, fontSize: '15px', color: COLORS.text, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5).setAlpha(0.8);

    this.add.text(cx, GAME_HEIGHT - 20, 'Fan project, not affiliated with or endorsed by Sony Interactive Entertainment or Naughty Dog.', {
      fontFamily: FONT, fontSize: '12px', color: COLORS.text,
    }).setOrigin(0.5).setAlpha(0.6);

    this.input.keyboard?.once('keydown-SPACE', () => {
      audio.ui('uiSelect');
      this.scene.start('Setup');
    });
  }
}
