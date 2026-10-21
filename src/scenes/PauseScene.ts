import * as Phaser from 'phaser';
import { audio } from '../audio/director';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TITLE_FONT } from '../config';
import { describeMod, weaponModifiers, type WeaponMod } from '../logic/arsenal';
import { describeItem, weaponBonus } from '../logic/describe';
import { ITEMS, ownedOfKind, SLOTS, type ItemId, type Loadout, type WeaponId } from '../logic/items';
import type { PlayerStats } from '../logic/stats';
import { addButton } from '../ui/button';
import { fitCamera } from '../render';

export interface PauseData {
  /** One line about the run: map zone, level, time, kills. */
  headline: string;
  loadout: Loadout;
  stats: PlayerStats;
  weaponMods: WeaponMod[];
  synergies: string[];
  /** Timed effects running right now, e.g. "Red eco: +50% damage (12s)". */
  effects: string[];
  onResume: () => void;
  onQuit: () => void;
}

const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

/** Overlay over the paused run: your build, your stats, and the details of anything you hover. */
export class PauseScene extends Phaser.Scene {
  private tooltip!: Phaser.GameObjects.Container;
  private tooltipText!: Phaser.GameObjects.Text;
  private tooltipBox!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Pause');
  }

  create(data: PauseData): void {
    fitCamera(this);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78).setOrigin(0);
    audio.duck(true);
    this.events.once('shutdown', () => audio.duck(false));
    this.add.text(GAME_WIDTH / 2, 34, 'PAUSED', { fontFamily: TITLE_FONT, fontSize: '36px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5).setStroke(COLORS.stroke, 6);
    this.add.text(GAME_WIDTH / 2, 68, data.headline, { fontFamily: FONT, fontSize: '15px', color: COLORS.text }).setOrigin(0.5).setAlpha(0.85);

    this.renderBuild(data);
    this.renderStats(data.stats);
    this.renderLists(data);
    this.createTooltip();

    addButton(this, GAME_WIDTH / 2 - 220, GAME_HEIGHT - 40, 'RESUME', () => data.onResume(), { width: 190 });
    addButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 40, 'OPTIONS', () => {
      this.scene.pause();
      this.scene.launch('Options', { from: 'Pause' });
    }, { width: 190, variant: 'back', sound: 'uiOpen' });
    addButton(this, GAME_WIDTH / 2 + 220, GAME_HEIGHT - 40, 'QUIT RUN', () => data.onQuit(), { width: 190, variant: 'danger', sound: 'uiBack' });
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 76, 'ESC / P to resume  ·  hover an item for details', {
      fontFamily: FONT, fontSize: '12px', color: COLORS.text,
    }).setOrigin(0.5).setAlpha(0.6);

    // The press that opened the pause can still be in this frame's key queue: skip any key event older than
    // the pause itself. A fixed delay instead would also swallow a quick second press meant to resume.
    const openedAt = performance.now();
    const resume = (event: KeyboardEvent) => {
      if (event.timeStamp > openedAt) data.onResume();
    };
    this.input.keyboard?.on('keydown-ESC', resume);
    this.input.keyboard?.on('keydown-P', resume);
  }

  /** Weapon and passive slots as hoverable icons. */
  private renderBuild(data: PauseData): void {
    const left = 40;
    (['weapon', 'passive'] as const).forEach((kind, row) => {
      const y = 110 + row * 110;
      this.add.text(left, y, kind === 'weapon' ? 'WEAPONS' : 'PASSIVES', {
        fontFamily: FONT, fontSize: '14px', color: COLORS.accent, fontStyle: 'bold',
      });
      const owned = ownedOfKind(data.loadout, kind);
      for (let slot = 0; slot < SLOTS[kind]; slot++) {
        const x = left + slot * 60;
        const id = owned[slot];
        const box = this.add.rectangle(x, y + 24, 52, 52, 0x000000, 0.6).setOrigin(0).setStrokeStyle(1, 0xffffff, 0.3);
        if (!id) continue;
        const level = data.loadout[id] ?? 1;
        this.add.rectangle(x + 4, y + 28, 44, 44, ITEMS[id].color).setOrigin(0);
        this.add.text(x + 48, y + 74, String(level), { fontFamily: FONT, fontSize: '14px', color: '#ffffff', fontStyle: 'bold' })
          .setOrigin(1).setStroke('#000000', 3);
        this.add.text(x + 26, y + 80, ITEMS[id].name, {
          fontFamily: FONT, fontSize: '10px', color: COLORS.text, align: 'center', wordWrap: { width: 58 },
        }).setOrigin(0.5, 0);
        box.setInteractive({ useHandCursor: true })
          .on('pointerover', (pointer: Phaser.Input.Pointer) => this.showTooltip(this.itemDetails(id, level, data), pointer))
          .on('pointermove', (pointer: Phaser.Input.Pointer) => this.moveTooltip(pointer))
          .on('pointerout', () => this.tooltip.setVisible(false));
      }
    });
  }

  private itemDetails(id: ItemId, level: number, data: PauseData): string {
    const weapon = ITEMS[id].kind === 'weapon';
    const mods = weapon ? weaponModifiers(id as WeaponId, data.loadout, data.weaponMods) : undefined;
    const bonus = mods && weaponBonus(data.stats, mods);
    const lines = [`${ITEMS[id].name}  ·  Level ${level}`, describeItem(id, level, bonus)];
    if (mods) {
      const extras = [
        mods.damage !== 1 && `${mods.damage > 1 ? '+' : ''}${pct(mods.damage - 1)} damage`,
        mods.cooldown !== 1 && `-${pct(1 - mods.cooldown)} cooldown`,
        mods.area !== 1 && `+${pct(mods.area - 1)} area`,
        mods.extra > 0 && `+${mods.extra} projectiles`,
      ].filter(Boolean);
      if (extras.length > 0) lines.push(`From synergy and mods: ${extras.join(', ')}`);
      lines.push('Totals include your passives, power-ups, synergy and mods.');
    }
    return lines.join('\n');
  }

  private renderStats(stats: PlayerStats): void {
    const x = 380;
    this.add.text(x, 110, 'STATS', { fontFamily: FONT, fontSize: '14px', color: COLORS.accent, fontStyle: 'bold' });
    const lines = [
      `Damage: +${pct(stats.damageMultiplier - 1)}`,
      `Cooldowns: -${pct(1 - stats.cooldownMultiplier)}`,
      `Area: +${pct(stats.areaMultiplier - 1)}`,
      `Damage taken: -${pct(stats.armor)}`,
      `Max health: ${Math.round(stats.maxHp)}`,
      `Regen: ${stats.regen.toFixed(1)} HP/s`,
      `Move speed: ${Math.round(stats.moveSpeed)}`,
      `Pickup range: ${Math.round(stats.pickupRadius)}`,
      `XP: +${pct(stats.xpMultiplier - 1)}`,
    ];
    this.add.text(x, 134, lines.join('\n'), { fontFamily: FONT, fontSize: '14px', color: COLORS.text, lineSpacing: 6 });
  }

  private renderLists(data: PauseData): void {
    const x = 600;
    const sections: [string, string[]][] = [
      ['SYNERGIES', data.synergies],
      ['WEAPON MODS', data.weaponMods.map(describeMod)],
      ['ACTIVE EFFECTS', data.effects],
    ];
    let y = 110;
    for (const [title, items] of sections) {
      this.add.text(x, y, title, { fontFamily: FONT, fontSize: '14px', color: COLORS.accent, fontStyle: 'bold' });
      const body = items.length > 0 ? items.slice(0, 6).join('\n') : 'None';
      const text = this.add.text(x, y + 22, body, {
        fontFamily: FONT, fontSize: '12px', color: COLORS.text, lineSpacing: 4, wordWrap: { width: 330 },
      }).setAlpha(items.length > 0 ? 1 : 0.5);
      y += 34 + text.height;
    }
  }

  private createTooltip(): void {
    this.tooltipBox = this.add.rectangle(0, 0, 10, 10, COLORS.panel, 0.97).setOrigin(0)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(COLORS.accent).color);
    this.tooltipText = this.add.text(10, 8, '', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.text, lineSpacing: 4, wordWrap: { width: 300 },
    });
    this.tooltip = this.add.container(0, 0, [this.tooltipBox, this.tooltipText]).setDepth(10).setVisible(false);
  }

  private showTooltip(text: string, pointer: Phaser.Input.Pointer): void {
    this.tooltipText.setText(text);
    this.tooltipBox.setSize(this.tooltipText.width + 20, this.tooltipText.height + 16);
    this.tooltip.setVisible(true);
    this.moveTooltip(pointer);
  }

  /** Next to the pointer, kept inside the screen. */
  private moveTooltip(pointer: Phaser.Input.Pointer): void {
    const w = this.tooltipBox.width;
    const h = this.tooltipBox.height;
    this.tooltip.setPosition(
      // World coordinates: the camera is zoomed to the render scale, so screen pixels don't match the layout
      Math.min(pointer.worldX + 16, GAME_WIDTH - w - 8),
      Math.min(pointer.worldY + 16, GAME_HEIGHT - h - 8),
    );
  }
}
