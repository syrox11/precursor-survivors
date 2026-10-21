import * as Phaser from 'phaser';
import { audio } from '../audio/director';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, getStorage, TITLE_FONT } from '../config';
import { MAPS } from '../logic/maps';
import {
  loadSettings, stepVolume, THEME_CHOICES, writeSettings, type Settings, type ThemeChoice, type VolumeChannel,
} from '../logic/settings';
import { addButton } from '../ui/button';
import { refreshTheme, theme } from '../ui/theme';
import { fitCamera } from '../render';

export interface OptionsData {
  /** Screen to go back to: the title, or the pause screen of a run in progress. */
  from: 'Title' | 'Pause';
}

const VOLUMES: [VolumeChannel, string][] = [['master', 'Master volume'], ['music', 'Music'], ['sfx', 'Sound effects']];
const SEGMENTS = 10;

const THEME_LABELS: Record<ThemeChoice, string> = { auto: 'AUTO', jak1: 'JAK 1', jak2: 'JAK 2', jak3: 'JAK 3' };

/** Volumes, mute and the menu theme. Every change is saved and applied at once. */
export class OptionsScene extends Phaser.Scene {
  private settings!: Settings;
  private from: OptionsData['from'] = 'Title';

  constructor() {
    super('Options');
  }

  create(data: OptionsData): void {
    fitCamera(this);
    this.from = data?.from ?? 'Title';
    this.settings = loadSettings(getStorage());
    const look = theme();
    const cx = GAME_WIDTH / 2;

    if (this.from === 'Pause') this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85).setOrigin(0);
    else this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, look.background).setOrigin(0).setAlpha(look.backgroundAlpha);

    this.add.text(cx, 40, 'OPTIONS', { fontFamily: TITLE_FONT, fontSize: '38px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5).setStroke(COLORS.stroke, 6);

    this.heading(88, 'SOUND');
    VOLUMES.forEach(([channel, label], i) => this.volumeRow(130 + i * 48, channel, label));
    addButton(this, cx, 274, this.settings.muted ? 'SOUND: MUTED' : 'SOUND: ON', () => {
      this.save({ ...this.settings, muted: !this.settings.muted });
    }, { width: 220, height: 38, fontSize: 17, variant: this.settings.muted ? 'danger' : 'secondary' });
    this.add.text(cx, 310, audio.available
      ? 'Original soundtrack: local audio pack found'
      : 'No local audio pack installed: the game plays without sound', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.text,
    }).setOrigin(0.5).setAlpha(0.7);

    this.heading(350, 'MENU THEME');
    THEME_CHOICES.forEach((choice, i) => {
      const selected = choice === this.settings.theme;
      addButton(this, cx + (i - 1.5) * 180, 395, THEME_LABELS[choice], () => {
        if (!selected) this.save({ ...this.settings, theme: choice }, true);
      }, { width: 160, height: 40, fontSize: 18, selected, variant: selected ? 'primary' : 'back' });
    });
    const note = this.settings.theme === 'auto'
      ? `Follows the map you pick for the run · now: ${look.name}`
      : `Menus, buttons, fonts and menu music of Jak ${this.settings.theme.slice(-1)}: ${MAPS[this.settings.theme].name}`;
    this.add.text(cx, 434, note, { fontFamily: FONT, fontSize: '14px', color: COLORS.text }).setOrigin(0.5).setAlpha(0.8);

    addButton(this, 110, GAME_HEIGHT - 40, 'BACK', () => this.back(), { width: 160, variant: 'back', sound: 'uiBack' });
    this.input.keyboard?.on('keydown-ESC', () => {
      audio.ui('uiBack');
      this.back();
    });
  }

  private heading(y: number, text: string): void {
    this.add.text(GAME_WIDTH / 2, y, text, { fontFamily: FONT, fontSize: '16px', color: COLORS.accent, fontStyle: 'bold' })
      .setOrigin(0.5);
  }

  /** "Label  [-] ▮▮▮▮▮▯▯▯▯▯ [+]  50%" */
  private volumeRow(y: number, channel: VolumeChannel, label: string): void {
    const value = this.settings[channel];
    this.add.text(250, y, label, { fontFamily: FONT, fontSize: '18px', color: COLORS.text, fontStyle: 'bold' }).setOrigin(0, 0.5);
    addButton(this, 470, y, '−', () => this.save(stepVolume(this.settings, channel, -1)), {
      width: 40, height: 36, fontSize: 22, variant: 'secondary', disabled: value <= 0,
    });
    const accent = Phaser.Display.Color.HexStringToColor(COLORS.accent).color;
    for (let i = 0; i < SEGMENTS; i++) {
      const lit = i < Math.round(value * SEGMENTS);
      this.add.rectangle(505 + i * 20, y, 15, 24, lit ? accent : 0xffffff, lit ? 1 : 0.15).setOrigin(0, 0.5);
    }
    addButton(this, 728, y, '+', () => this.save(stepVolume(this.settings, channel, 1)), {
      width: 40, height: 36, fontSize: 22, variant: 'secondary', disabled: value >= 1,
    });
    this.add.text(765, y, `${Math.round(value * 100)}%`, { fontFamily: FONT, fontSize: '16px', color: COLORS.text }).setOrigin(0, 0.5);
  }

  /** Saves, applies and redraws. A new theme also brings its menu music when we're in the menus. */
  private save(settings: Settings, themeChanged = false): void {
    this.settings = settings;
    writeSettings(getStorage(), settings);
    audio.applySettings(settings);
    if (themeChanged) {
      refreshTheme();
      if (this.from === 'Title') audio.menuMusic();
    }
    this.scene.restart({ from: this.from });
  }

  private back(): void {
    if (this.from === 'Title') {
      this.scene.start('Title');
      return;
    }
    // The pause screen redraws so a new theme shows there too
    const pause = this.scene.get('Pause');
    this.scene.stop();
    pause.scene.restart(pause.sys.settings.data);
  }
}
