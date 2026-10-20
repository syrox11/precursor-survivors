export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** Square play area in pixels. */
export const WORLD_SIZE = 4000;

/** Survive this many seconds to earn the Power Cell. */
export const RUN_DURATION = 600;

export const PLAYER_RADIUS = 12;

export const FONT = '"Trebuchet MS", Verdana, sans-serif';

export const COLORS = {
  orb: 0xff9f1c,
  hp: 0x38b000,
  hpBack: 0x1b3a1b,
  xp: 0xff9f1c,
  xpBack: 0x3a2a10,
  panel: 0x0d1b1e,
  text: '#fff4d6',
  accent: '#ffb703',
};

export function getStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
