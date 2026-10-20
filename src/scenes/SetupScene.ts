import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, getStorage } from '../config';
import { ITEMS, type ItemId } from '../logic/items';
import { COMPANIONS, SKINS } from '../logic/meta';
import { loadSave, writeSave, type RunSetup, type SaveData } from '../logic/save';
import { addButton } from '../ui/button';

/** Pick starting weapon, companion, skin and banned items before a run. */
export class SetupScene extends Phaser.Scene {
  private save!: SaveData;
  private setup!: RunSetup;
  private content!: Phaser.GameObjects.Container;

  constructor() {
    super('Setup');
  }

  create(): void {
    this.save = loadSave(getStorage());
    this.setup = { ...this.save.setup, banned: [...this.save.setup.banned] };
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'sand').setOrigin(0).setAlpha(0.15);
    this.add.text(GAME_WIDTH / 2, 36, 'PREPARE YOUR RUN', { fontFamily: FONT, fontSize: '34px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#3a2a10', 6);

    this.content = this.add.container(0, 0);
    this.render();

    addButton(this, 130, GAME_HEIGHT - 40, 'BACK', () => this.scene.start('Title'), { width: 160, color: 0x8d99ae });
    addButton(this, GAME_WIDTH - 150, GAME_HEIGHT - 40, 'START RUN', () => this.startRun(), { width: 220 });
    this.input.keyboard?.on('keydown-ENTER', () => this.startRun());
    this.input.keyboard?.on('keydown-SPACE', () => this.startRun());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
  }

  private startRun(): void {
    writeSave(getStorage(), { ...this.save, setup: this.setup });
    this.scene.start('Game');
  }

  private render(): void {
    this.content.removeAll(true);
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T) => {
      this.content.add(obj);
      return obj;
    };

    // Left: preview + selectors
    add(this.add.image(110, 150, SKINS[this.setup.skin].texture).setScale(2.4));
    add(this.add.image(155, 128, COMPANIONS[this.setup.companion].texture).setScale(2.4));

    const weapon = ITEMS[this.setup.weapon];
    this.selector(add, 105, 'Starting weapon', weapon.name, weapon.describe(1), this.save.weapons, this.setup.weapon, (id) => {
      this.setup.weapon = id;
      // You can't ban the weapon you start with
      this.setup.banned = this.setup.banned.filter((b) => b !== id);
    });
    const companion = COMPANIONS[this.setup.companion];
    this.selector(add, 215, 'Companion', companion.name, companion.description, this.save.companions, this.setup.companion, (id) => {
      this.setup.companion = id;
    });
    this.selector(add, 325, 'Skin', SKINS[this.setup.skin].name, 'Cosmetic', this.save.skins, this.setup.skin, (id) => {
      this.setup.skin = id;
    });

    // Right: bans
    const left = 600;
    const slots = this.save.banSlots;
    add(this.add.text(left, 80, `Banned items  ${this.setup.banned.length}/${slots}`, {
      fontFamily: FONT, fontSize: '18px', color: COLORS.text, fontStyle: 'bold',
    }));
    add(this.add.text(left, 104, slots === 0
      ? 'Buy ban slots in the shop to stop items from being offered.'
      : 'Click an item so it never shows up on level up.', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.text, wordWrap: { width: 330 },
    }).setAlpha(0.75));

    (Object.keys(ITEMS) as ItemId[]).forEach((id, i) => {
      const x = left + (i % 2) * 168;
      const y = 140 + Math.floor(i / 2) * 36;
      const banned = this.setup.banned.includes(id);
      const isStart = id === this.setup.weapon;
      const canToggle = !isStart && (banned || this.setup.banned.length < slots);

      const chip = add(this.add.rectangle(x, y, 160, 30, banned ? 0x5c1a1a : COLORS.panel, 0.95)
        .setOrigin(0)
        .setStrokeStyle(2, banned ? 0xe5383b : ITEMS[id].color, banned ? 1 : 0.6));
      add(this.add.text(x + 10, y + 15, `${banned ? '✕ ' : ''}${ITEMS[id].name}`, {
        fontFamily: FONT, fontSize: '14px', color: COLORS.text,
      }).setOrigin(0, 0.5).setAlpha(canToggle || banned ? 1 : 0.45));
      if (canToggle) {
        chip.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          this.setup.banned = banned ? this.setup.banned.filter((b) => b !== id) : [...this.setup.banned, id];
          this.render();
        });
      }
    });
  }

  /** A "< value >" row cycling through the unlocked options. */
  private selector<T extends string>(
    add: <O extends Phaser.GameObjects.GameObject>(obj: O) => O,
    y: number,
    title: string,
    value: string,
    description: string,
    options: readonly T[],
    current: T,
    onChange: (id: T) => void,
  ): void {
    const x = 380;
    add(this.add.text(x, y - 22, title, { fontFamily: FONT, fontSize: '15px', color: COLORS.accent }).setOrigin(0.5));
    add(this.add.text(x, y + 6, value, { fontFamily: FONT, fontSize: '20px', color: COLORS.text, fontStyle: 'bold' }).setOrigin(0.5));
    add(this.add.text(x, y + 34, description, {
      fontFamily: FONT, fontSize: '13px', color: COLORS.text, align: 'center', wordWrap: { width: 270 },
    }).setOrigin(0.5, 0).setAlpha(0.8));

    if (options.length < 2) return;
    const index = options.indexOf(current);
    const step = (delta: number) => {
      onChange(options[(index + delta + options.length) % options.length]);
      this.render();
    };
    for (const [dx, label, delta] of [[-160, '◀', -1], [160, '▶', 1]] as const) {
      const arrow = add(this.add.text(x + dx, y + 6, label, { fontFamily: FONT, fontSize: '24px', color: COLORS.accent }).setOrigin(0.5));
      arrow.setInteractive({ useHandCursor: true }).on('pointerdown', () => step(delta));
    }
  }
}
