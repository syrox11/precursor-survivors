import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { ITEMS, levelOf, type ItemId, type Loadout } from '../logic/items';

export interface LevelUpData {
  level: number;
  choices: ItemId[];
  loadout: Loadout;
  onChoose: (id: ItemId) => void;
}

/** Overlay shown on top of the paused game. Pick with a click or the 1/2/3 keys. */
export class LevelUpScene extends Phaser.Scene {
  constructor() {
    super('LevelUp');
  }

  create(data: LevelUpData): void {
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0);
    this.add.text(cx, 90, `LEVEL ${data.level}!`, { fontFamily: FONT, fontSize: '40px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#3a2a10', 6);
    this.add.text(cx, 135, 'Choose an upgrade', { fontFamily: FONT, fontSize: '18px', color: COLORS.text }).setOrigin(0.5);

    const cardWidth = 250;
    const gap = 30;
    const startX = cx - ((data.choices.length - 1) * (cardWidth + gap)) / 2;

    let chosen = false;
    const choose = (id: ItemId) => {
      if (chosen) return;
      chosen = true;
      data.onChoose(id);
    };

    data.choices.forEach((id, i) => {
      const def = ITEMS[id];
      const nextLevel = levelOf(data.loadout, id) + 1;
      const x = startX + i * (cardWidth + gap);
      const y = 290;

      const card = this.add.rectangle(x, y, cardWidth, 220, COLORS.panel, 0.95)
        .setStrokeStyle(3, def.color)
        .setInteractive({ useHandCursor: true });
      this.add.circle(x, y - 60, 22, def.color);
      this.add.text(x, y - 15, def.name, { fontFamily: FONT, fontSize: '22px', color: COLORS.text, fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(x, y - 98, def.kind === 'weapon' ? 'WEAPON' : 'PASSIVE', { fontFamily: FONT, fontSize: '12px', color: COLORS.text })
        .setOrigin(0.5).setAlpha(0.7);
      this.add.text(x, y + 15, nextLevel === 1 ? 'NEW' : `Level ${nextLevel}`, { fontFamily: FONT, fontSize: '14px', color: COLORS.accent })
        .setOrigin(0.5);
      this.add.text(x, y + 55, def.describe(nextLevel), {
        fontFamily: FONT, fontSize: '15px', color: COLORS.text, align: 'center', wordWrap: { width: cardWidth - 30 },
      }).setOrigin(0.5);
      this.add.text(x, y + 95, `[${i + 1}]`, { fontFamily: FONT, fontSize: '13px', color: COLORS.text }).setOrigin(0.5).setAlpha(0.6);

      card.on('pointerover', () => card.setFillStyle(0x1f3a40, 0.95));
      card.on('pointerout', () => card.setFillStyle(COLORS.panel, 0.95));
      card.on('pointerdown', () => choose(id));
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < data.choices.length) choose(data.choices[index]);
    });
  }
}
