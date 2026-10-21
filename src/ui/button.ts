import type * as Phaser from 'phaser';
import { audio, type SfxKey } from '../audio/director';
import { COLORS, FONT } from '../config';
import { theme, type ButtonVariant } from './theme';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  /** Colour role from the theme. */
  variant?: ButtonVariant;
  /** Exact border colour, for buttons that carry meaning of their own (an item's colour, a dimmed tab). */
  color?: number;
  disabled?: boolean;
  /** Drawn as the chosen one of a group, e.g. the current tab. */
  selected?: boolean;
  /** Menu sound on click; going back and buying have their own. */
  sound?: SfxKey;
}

export interface Button {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
}

/** Text button centred on (x, y), shaped like the current theme. Disabled buttons are dimmed and ignore clicks. */
export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  onClick: () => void,
  options: ButtonOptions = {},
): Button {
  const { width = 200, height = 44, fontSize = 20, variant = 'primary', disabled = false, selected = false, sound = 'uiSelect' } = options;
  const look = theme();
  const color = options.color ?? look.buttons[variant];
  const background = scene.add.graphics();
  const draw = (hover: boolean) => drawButton(background, width, height, color, hover || selected);
  draw(false);

  const label = scene.add.text(0, 0, text, {
    fontFamily: FONT, fontSize: `${fontSize}px`, color: COLORS.text, fontStyle: 'bold',
  }).setOrigin(0.5);
  const hitArea = scene.add.zone(0, 0, width, height);
  const container = scene.add.container(x, y, [background, label, hitArea]);

  if (disabled) {
    container.setAlpha(0.4);
    return { container, label };
  }

  hitArea.setInteractive({ useHandCursor: true });
  hitArea.on('pointerover', () => {
    draw(true);
    container.setScale(1.04);
    audio.ui('uiMove');
  });
  hitArea.on('pointerout', () => {
    draw(false);
    container.setScale(1);
  });
  hitArea.on('pointerdown', () => {
    audio.ui(sound);
    onClick();
  });
  return { container, label };
}

/** The button body for the current theme's shape. */
function drawButton(g: Phaser.GameObjects.Graphics, width: number, height: number, color: number, lit: boolean): void {
  const look = theme();
  const fill = lit ? look.panelHover : look.panel;
  const left = -width / 2;
  const top = -height / 2;
  g.clear();

  switch (look.shape) {
    case 'round': {
      const radius = Math.min(height / 2, 18);
      g.fillStyle(fill, 0.95).fillRoundedRect(left, top, width, height, radius);
      g.lineStyle(3, color, 1).strokeRoundedRect(left, top, width, height, radius);
      // Soft highlight across the top, like the glossy Jak 1 menus
      g.fillStyle(0xffffff, lit ? 0.12 : 0.06).fillRoundedRect(left + 6, top + 4, width - 12, height / 3, { tl: radius - 4, tr: radius - 4, bl: 2, br: 2 });
      break;
    }
    case 'plated': {
      // Chamfered metal plate with a coloured bar on the left
      const cut = Math.min(12, height / 3);
      // Phaser takes any {x, y} here; its typings ask for Vector2
      const points = [
        { x: left + cut, y: top }, { x: left + width, y: top }, { x: left + width, y: top + height - cut },
        { x: left + width - cut, y: top + height }, { x: left, y: top + height }, { x: left, y: top + cut },
      ] as Phaser.Math.Vector2[];
      g.fillStyle(fill, 0.96).fillPoints(points, true);
      g.lineStyle(2, color, lit ? 1 : 0.8).strokePoints(points, true);
      if (width >= 80) g.fillStyle(color, 1).fillRect(left + 4, top + cut, 4, height - cut * 2);
      g.lineStyle(1, 0xffffff, 0.08).lineBetween(left + cut + 2, top + 3, left + width - 3, top + 3);
      break;
    }
    case 'worn': {
      // Sun-bleached slab: double outline and a couple of scratches
      g.fillStyle(fill, 0.95).fillRoundedRect(left, top, width, height, 5);
      g.lineStyle(3, color, 1).strokeRoundedRect(left, top, width, height, 5);
      g.lineStyle(1, color, lit ? 0.7 : 0.4).strokeRoundedRect(left + 5, top + 5, width - 10, height - 10, 3);
      g.lineStyle(2, color, 0.45);
      g.lineBetween(left + width - 22, top + 8, left + width - 12, top + 18);
      g.lineBetween(left + 10, top + height - 16, left + 18, top + height - 8);
      break;
    }
  }
}
