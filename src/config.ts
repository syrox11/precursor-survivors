export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** Square play area in pixels. */
export const WORLD_SIZE = 4000;

/** Survive this many seconds to earn the Power Cell. */
export const RUN_DURATION = 600;

export const PLAYER_RADIUS = 12;

const FALLBACK_FONT = '"Trebuchet MS", Verdana, sans-serif';

/** Body and title fonts. They change with the UI theme (see ui/theme.ts), so read them when drawing. */
export let FONT = FALLBACK_FONT;
export let TITLE_FONT = FALLBACK_FONT;

export function setFonts(body: string, title: string): void {
  FONT = `${body}, ${FALLBACK_FONT}`;
  TITLE_FONT = `${title}, ${FALLBACK_FONT}`;
}

/** The panel, text and accent entries are overwritten by the UI theme. */
export const COLORS = {
  orb: 0xff9f1c,
  hp: 0x38b000,
  hpBack: 0x1b3a1b,
  xp: 0xff9f1c,
  xpBack: 0x3a2a10,
  panel: 0x0d1b1e,
  panelHover: 0x1f3a40,
  text: '#fff4d6',
  accent: '#ffb703',
  /** Outline of big titles. */
  stroke: '#3a2a10',
};

export function getStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
