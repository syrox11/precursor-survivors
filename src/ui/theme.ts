import { audio } from '../audio/director';
import { COLORS, getStorage, setFonts, TITLE_FONT } from '../config';
import { groundTexture, type MapId } from '../logic/maps';
import { loadSave } from '../logic/save';
import { loadSettings, resolveTheme } from '../logic/settings';

/** Jak and Daxter logo lettering, when installed locally (see main.ts). Each theme falls back to its own title font. */
export const LOGO_FAMILY = 'Ottselesque';

export type ButtonShape = 'round' | 'plated' | 'worn';
export type ButtonVariant = 'primary' | 'secondary' | 'back' | 'danger';

/** The look of the menus and HUD in the style of one of the three games. */
export interface Theme {
  id: MapId;
  name: string;
  /** Google Fonts families, loaded in index.html. */
  font: string;
  titleFont: string;
  panel: number;
  panelHover: number;
  text: string;
  accent: string;
  stroke: string;
  buttons: Record<ButtonVariant, number>;
  shape: ButtonShape;
  /** Tiled behind the menus. */
  background: string;
  backgroundAlpha: number;
}

export const THEMES: Record<MapId, Theme> = {
  // Sandover: warm sand, Precursor orange and teal, soft round shapes
  jak1: {
    id: 'jak1', name: 'The Precursor Legacy', font: '"Fredoka"', titleFont: `"${LOGO_FAMILY}", "Fredoka"`,
    panel: 0x0d1b1e, panelHover: 0x1f3a40, text: '#fff4d6', accent: '#ffb703', stroke: '#3a2a10',
    buttons: { primary: 0xffb703, secondary: 0x4cc9f0, back: 0x8d99ae, danger: 0xe5383b },
    shape: 'round', background: 'sand', backgroundAlpha: 0.22,
  },
  // Haven City: gunmetal plates and Krimzon Guard red
  jak2: {
    id: 'jak2', name: 'Renegade', font: '"Exo 2"', titleFont: `"${LOGO_FAMILY}", "Russo One"`,
    panel: 0x15181c, panelHover: 0x2a2f36, text: '#e6ebf0', accent: '#e63946', stroke: '#0b0c0e',
    buttons: { primary: 0xe63946, secondary: 0x9fb3c8, back: 0x5c6670, danger: 0xff8800 },
    shape: 'plated', background: groundTexture('jak2', 0), backgroundAlpha: 0.3,
  },
  // Spargus and the desert: sun-bleached sand, rust and worn edges
  jak3: {
    id: 'jak3', name: 'Wastelander', font: '"Kanit"', titleFont: `"${LOGO_FAMILY}", "Bungee"`,
    panel: 0x2a1c12, panelHover: 0x4a3222, text: '#f6e7cf', accent: '#f4a259', stroke: '#2a1408',
    buttons: { primary: 0xf4a259, secondary: 0x5fa8a0, back: 0x9c8a74, danger: 0xbc4b51 },
    shape: 'worn', background: groundTexture('jak3', 1), backgroundAlpha: 0.3,
  },
};

let current: Theme = THEMES.jak1;

export function theme(): Theme {
  return current;
}

export function applyTheme(id: MapId): void {
  current = THEMES[id];
  COLORS.panel = current.panel;
  COLORS.panelHover = current.panelHover;
  COLORS.text = current.text;
  COLORS.accent = current.accent;
  COLORS.stroke = current.stroke;
  setFonts(current.font, current.titleFont);
  audio.setUiGame(id);
}

/** Re-reads the theme choice and the map picked for the next run, and applies the result. */
export function refreshTheme(): Theme {
  const storage = getStorage();
  applyTheme(resolveTheme(loadSettings(storage).theme, loadSave(storage).setup.map));
  return current;
}

/** Fonts every theme uses, for the loading screen to wait on. */
export const THEME_FONTS = [...new Set(Object.values(THEMES).flatMap((t) => [t.font, t.titleFont.split(', ').at(-1)!]))];

/** The game's logo: the Jak and Daxter lettering in every theme, else the theme's title font. */
export function logoFont(): string {
  return `"${LOGO_FAMILY}", ${TITLE_FONT}`;
}
