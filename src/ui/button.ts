import type * as Phaser from 'phaser';
import { COLORS, FONT } from '../config';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  color?: number;
  disabled?: boolean;
}

export interface Button {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
}

/** Rounded-looking text button centred on (x, y). Disabled buttons are dimmed and ignore clicks. */
export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  onClick: () => void,
  options: ButtonOptions = {},
): Button {
  const { width = 200, height = 44, fontSize = 20, color = 0xffb703, disabled = false } = options;
  const background = scene.add.rectangle(0, 0, width, height, COLORS.panel, 0.95).setStrokeStyle(2, color);
  const label = scene.add.text(0, 0, text, {
    fontFamily: FONT, fontSize: `${fontSize}px`, color: COLORS.text, fontStyle: 'bold',
  }).setOrigin(0.5);
  const container = scene.add.container(x, y, [background, label]);

  if (disabled) {
    container.setAlpha(0.4);
    return { container, label };
  }

  background.setInteractive({ useHandCursor: true });
  background.on('pointerover', () => background.setFillStyle(0x1f3a40, 0.95));
  background.on('pointerout', () => background.setFillStyle(COLORS.panel, 0.95));
  background.on('pointerdown', onClick);
  return { container, label };
}
