import * as Phaser from 'phaser';
import { audio } from './audio/director';
import { GAME_HEIGHT, GAME_WIDTH, getStorage } from './config';
import { debugEnabled } from './debug';
import { loadSettings } from './logic/settings';
import { RENDER_SCALE } from './render';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { OptionsScene } from './scenes/OptionsScene';
import { SetupScene } from './scenes/SetupScene';
import { ShopScene } from './scenes/ShopScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { PauseScene } from './scenes/PauseScene';
import { TitleScene } from './scenes/TitleScene';
import { LOGO_FAMILY, refreshTheme, THEME_FONTS } from './ui/theme';

/**
 * Ottselesque (chriskirknielsen.com/fonts/ottselesque) is free for personal use but can't be redistributed
 * without its author's permission, so it is only picked up from a local, gitignored folder. Without it the
 * logo and titles fall back to the theme fonts.
 */
async function loadLocalFonts(): Promise<void> {
  try {
    const face = await new FontFace(LOGO_FAMILY, `url(${import.meta.env.BASE_URL}fonts-local/Ottselesque-Regular.otf)`).load();
    document.fonts.add(face);
  } catch {
    // Not installed locally
  }
}

/** Canvas text can't swap fonts once drawn: wait for the theme fonts, but never long (offline, slow CDN). */
async function loadFonts(): Promise<void> {
  await loadLocalFonts();
  const loads = THEME_FONTS.flatMap((family) => [`400 16px ${family}`, `700 16px ${family}`].map((font) => document.fonts.load(font)));
  await Promise.race([Promise.allSettled(loads), new Promise((resolve) => setTimeout(resolve, 2500))]);
}

/**
 * Text is drawn to its own little canvas: at the default resolution it would be stretched by the camera zoom
 * and look blurry, so every text is created at the render scale unless it asks otherwise.
 */
function sharpText(): void {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype as unknown as {
    text(x: number, y: number, text: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text;
  };
  const text = factory.text;
  factory.text = function (this: Phaser.GameObjects.GameObjectFactory, x, y, value, style) {
    return text.call(this, x, y, value, { resolution: RENDER_SCALE, ...style });
  };
}

async function start(): Promise<void> {
  sharpText();
  await loadFonts();
  refreshTheme();
  // The original-audio pack is optional and local-only: without it the game simply plays silent
  void audio.init(loadSettings(getStorage()));

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    // Every camera zooms by the render scale: layout stays in 960x540 units (see render.ts)
    width: GAME_WIDTH * RENDER_SCALE,
    height: GAME_HEIGHT * RENDER_SCALE,
    backgroundColor: '#0d1b1e',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    // Sound goes through the audio director, not Phaser
    audio: { noAudio: true },
    // Scenes draw in this order: Options goes last so it also covers a paused run when opened from the pause
    scene: [BootScene, TitleScene, SetupScene, ShopScene, GameScene, LevelUpScene, PauseScene, GameOverScene, OptionsScene],
  });

  // Lets end-to-end tests see which screen is up, since everything is drawn on a canvas
  if (debugEnabled(window.location.search)) {
    window.__precursorScenes = () => game.scene.getScenes(true).map((scene) => scene.scene.key);
    window.__precursorTopScene = () => game.scene.getScenes(false)
      .filter((scene) => (scene.sys.isActive() || scene.sys.isPaused()) && scene.sys.isVisible())
      .at(-1)?.scene.key;
  }
}

void start();
