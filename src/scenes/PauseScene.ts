import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { describeMod, weaponModifiers, type WeaponMod } from '../logic/arsenal';
import { describeItem, weaponBonus } from '../logic/describe';
import { ITEMS, ownedOfKind, SLOTS, type ItemId, type Loadout, type WeaponId } from '../logic/items';
import type { PlayerStats } from '../logic/stats';
import { addButton } from '../ui/button';

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
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 34, 'PAUSED', { fontFamily: FONT, fontSize: '36px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5).setStroke('#3a2a10', 6);
    this.add.text(GAME_WIDTH / 2, 68, data.headline, { fontFamily: FONT, fontSize: '15px', color: COLORS.text }).setOrigin(0.5).setAlpha(0.85);

    this.renderBuild(data);
    this.renderStats(data.stats);
    this.renderLists(data);
    this.createTooltip();

    addButton(this, GAME_WIDTH / 2 - 120, GAME_HEIGHT - 40, 'RESUME', () => data.onResume(), { width: 200 });
    addButton(this, GAME_WIDTH / 2 + 120, GAME_HEIGHT - 40, 'QUIT RUN', () => data.onQuit(), { width: 200, color: 0xe5383b });
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 76, 'ESC / P to resume  ·  hover an item for details', {
      fontFamily: FONT, fontSize: '12px', color: COLORS.text,
    }).setOrigin(0.5).setAlpha(0.6);

    // Ignore the very press that opened the pause
    this.time.delayedCall(150, () => {
      this.input.keyboard?.on('keydown-ESC', () => data.onResume());
      this.input.keyboard?.on('keydown-P', () => data.onResume());
    });
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
    this.tooltipBox = this.add.rectangle(0, 0, 10, 10, COLORS.panel, 0.97).setOrigin(0).setStrokeStyle(2, 0xffb703);
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
      Math.min(pointer.x + 16, GAME_WIDTH - w - 8),
      Math.min(pointer.y + 16, GAME_HEIGHT - h - 8),
    );
  }
}
