import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { COLOR_HEX, COLOR_NAMES, GUN_COLORS } from '../logic/arsenal';
import { ITEMS, levelOf, type ItemId, type Loadout, type WeaponId } from '../logic/items';
import { addButton } from '../ui/button';

export interface LevelUpData {
  /** Headline, e.g. "LEVEL 5!" or a character's gift. */
  title: string;
  choices: ItemId[];
  loadout: Loadout;
  rerollsLeft: number;
  /** Spends a reroll and returns new choices. */
  onReroll: () => ItemId[];
  onChoose: (id: ItemId) => void;
}

const KEY_GRACE_MS = 400;

/** Overlay shown on top of the paused game. Pick with a click or the 1/2/3 keys; R rerolls. */
export class LevelUpScene extends Phaser.Scene {
  private data_!: LevelUpData;
  private choices: ItemId[] = [];
  private rerollsLeft = 0;
  private chosen = false;
  private cards!: Phaser.GameObjects.Container;

  constructor() {
    super('LevelUp');
  }

  create(data: LevelUpData): void {
    this.data_ = data;
    this.choices = data.choices;
    this.rerollsLeft = data.rerollsLeft;
    this.chosen = false;

    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0);
    this.add.text(cx, 80, data.title, { fontFamily: FONT, fontSize: '40px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#3a2a10', 6);
    this.add.text(cx, 125, 'Choose an upgrade', { fontFamily: FONT, fontSize: '18px', color: COLORS.text }).setOrigin(0.5);

    this.cards = this.add.container(0, 0);
    this.renderCards();

    // Keys 1-4 also cast Light/Dark Jak abilities: ignore presses that land as the overlay pops up
    const openedAt = this.time.now;
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.time.now - openedAt < KEY_GRACE_MS) return;
      if (event.key.toLowerCase() === 'r') return this.reroll();
      const index = Number(event.key) - 1;
      if (index >= 0 && index < this.choices.length) this.choose(this.choices[index]);
    });
  }

  private choose(id: ItemId): void {
    if (this.chosen) return;
    this.chosen = true;
    this.data_.onChoose(id);
  }

  private reroll(): void {
    if (this.chosen || this.rerollsLeft <= 0) return;
    this.rerollsLeft--;
    this.choices = this.data_.onReroll();
    this.renderCards();
  }

  private renderCards(): void {
    this.cards.removeAll(true);
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T) => {
      this.cards.add(obj);
      return obj;
    };

    const cx = GAME_WIDTH / 2;
    const cardWidth = 250;
    const gap = 30;
    const startX = cx - ((this.choices.length - 1) * (cardWidth + gap)) / 2;

    this.choices.forEach((id, i) => {
      const def = ITEMS[id];
      const nextLevel = levelOf(this.data_.loadout, id) + 1;
      const x = startX + i * (cardWidth + gap);
      const y = 280;

      const card = add(this.add.rectangle(x, y, cardWidth, 220, COLORS.panel, 0.95)
        .setStrokeStyle(3, def.color)
        .setInteractive({ useHandCursor: true }));
      const gunColor = def.kind === 'weapon' ? GUN_COLORS[id as WeaponId] : undefined;
      const kindLabel = def.kind === 'passive' ? 'PASSIVE' : gunColor ? `${COLOR_NAMES[gunColor].toUpperCase()} WEAPON` : 'WEAPON';
      add(this.add.text(x, y - 98, kindLabel, { fontFamily: FONT, fontSize: '12px', color: gunColor ? COLOR_HEX[gunColor] : COLORS.text })
        .setOrigin(0.5).setAlpha(0.7));
      add(this.add.circle(x, y - 60, 22, def.color));
      add(this.add.text(x, y - 15, def.name, { fontFamily: FONT, fontSize: '22px', color: COLORS.text, fontStyle: 'bold' }).setOrigin(0.5));
      add(this.add.text(x, y + 15, nextLevel === 1 ? 'NEW' : `Level ${nextLevel}`, { fontFamily: FONT, fontSize: '14px', color: COLORS.accent })
        .setOrigin(0.5));
      add(this.add.text(x, y + 55, def.describe(nextLevel), {
        fontFamily: FONT, fontSize: '15px', color: COLORS.text, align: 'center', wordWrap: { width: cardWidth - 30 },
      }).setOrigin(0.5));
      add(this.add.text(x, y + 95, `[${i + 1}]`, { fontFamily: FONT, fontSize: '13px', color: COLORS.text }).setOrigin(0.5).setAlpha(0.6));

      card.on('pointerover', () => card.setFillStyle(0x1f3a40, 0.95));
      card.on('pointerout', () => card.setFillStyle(COLORS.panel, 0.95));
      card.on('pointerdown', () => this.choose(id));
    });

    if (this.rerollsLeft > 0) {
      add(addButton(this, cx, 455, `REROLL [R]  (${this.rerollsLeft} left)`, () => this.reroll(), {
        width: 280, height: 40, fontSize: 17, color: 0x4cc9f0,
      }).container);
    }
  }
}
