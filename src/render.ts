import type * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';

const MAX_SCALE = 3;

/**
 * Canvas pixels per game pixel. The game is laid out on a 960x540 board, but drawing it at that size and
 * letting the browser stretch it looks blurry on any modern screen. Instead the canvas matches the screen
 * (x2 on 1080p, x3 from 1440p or on high-DPI laptops) and every camera zooms by the same factor, so all
 * positions stay in 960x540 units. `?res=1` to `?res=4` forces a value, e.g. for a slow machine.
 */
export const RENDER_SCALE = renderScale();

function renderScale(): number {
  if (typeof window === 'undefined') return 1;
  const forced = Number(new URLSearchParams(window.location.search).get('res'));
  if (Number.isInteger(forced) && forced >= 1 && forced <= 4) return forced;
  const fit = Math.min(window.screen.width / GAME_WIDTH, window.screen.height / GAME_HEIGHT) * (window.devicePixelRatio || 1);
  // A hair under a whole number (1919px wide windows, rounding in devicePixelRatio) shouldn't jump a step
  return Math.min(MAX_SCALE, Math.max(1, Math.ceil(fit - 0.05)));
}

/**
 * Zooms the scene's camera to the render scale and points it at the 960x540 board. The origin stays at the
 * centre, where Phaser's follow and world bounds already account for zoom; what that does to screen-fixed
 * objects is undone by `fixedLayerOffset`.
 */
export function fitCamera(scene: Phaser.Scene): Phaser.Cameras.Scene2D.Camera {
  const camera = scene.cameras.main;
  if (RENDER_SCALE === 1) return camera;
  return camera.setZoom(RENDER_SCALE).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

/**
 * Where to put a layer of screen-fixed objects (scroll factor 0, like the HUD) so that they line up with
 * the board: a zoomed camera scales them around the canvas centre, which pushes them off by this much.
 */
export function fixedLayerOffset(): { x: number; y: number } {
  return { x: (GAME_WIDTH / 2) * (RENDER_SCALE - 1), y: (GAME_HEIGHT / 2) * (RENDER_SCALE - 1) };
}
