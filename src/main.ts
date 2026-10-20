import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { debugEnabled } from './debug';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { SetupScene } from './scenes/SetupScene';
import { ShopScene } from './scenes/ShopScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { PauseScene } from './scenes/PauseScene';
import { TitleScene } from './scenes/TitleScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0d1b1e',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, SetupScene, ShopScene, GameScene, LevelUpScene, PauseScene, GameOverScene],
});

// Lets end-to-end tests see which screen is up, since everything is drawn on a canvas
if (debugEnabled(window.location.search)) {
  window.__precursorScenes = () => game.scene.getScenes(true).map((scene) => scene.scene.key);
}
