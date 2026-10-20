import * as Phaser from 'phaser';

/**
 * Placeholder art drawn with shapes at startup, so phase 1 needs no image files.
 * Each texture key is what the real sprite will replace later.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.texture('jak', 32, 40, (g) => {
      g.fillStyle(0x3b2a1a).fillRect(9, 30, 5, 10).fillRect(18, 30, 5, 10); // legs
      g.fillStyle(0x2f6fb0).fillRoundedRect(6, 16, 20, 17, 5); // tunic
      g.fillStyle(0xf0c090).fillCircle(16, 12, 8); // face
      g.fillStyle(0x3fbf5f).fillTriangle(6, 10, 16, -2, 26, 10).fillTriangle(16, 6, 30, 0, 24, 12); // hair
      g.fillStyle(0xd9a441).fillRect(8, 7, 16, 3); // goggles
      g.fillStyle(0x1a1a1a).fillCircle(13, 13, 1.5).fillCircle(19, 13, 1.5);
    });

    this.texture('daxter', 20, 20, (g) => {
      g.fillStyle(0xe8862a).fillCircle(10, 12, 7);
      g.fillTriangle(3, 8, 6, 0, 9, 7).fillTriangle(11, 7, 14, 0, 17, 8); // ears
      g.fillStyle(0xfbe3c0).fillCircle(10, 14, 4);
      g.fillStyle(0x1a1a1a).fillCircle(8, 11, 1.2).fillCircle(12, 11, 1.2);
    });

    this.texture('lurkerPuppy', 24, 20, (g) => {
      g.fillStyle(0x7b4fa0).fillEllipse(12, 12, 22, 14);
      g.fillStyle(0x5a3478).fillTriangle(2, 8, 6, 0, 9, 7);
      g.fillStyle(0xffd60a).fillCircle(8, 10, 2).fillCircle(15, 10, 2);
    });

    this.texture('babak', 34, 38, (g) => {
      g.fillStyle(0x4a2f66).fillEllipse(17, 22, 30, 30);
      g.fillStyle(0x8a6aa8).fillEllipse(17, 26, 16, 16); // belly
      g.fillStyle(0x4a2f66).fillTriangle(6, 12, 10, 0, 15, 10).fillTriangle(19, 10, 24, 0, 28, 12); // horns
      g.fillStyle(0xe5383b).fillCircle(12, 15, 2.5).fillCircle(22, 15, 2.5);
    });

    this.texture('lurkerCrab', 44, 30, (g) => {
      g.fillStyle(0x9a4a2a).fillEllipse(22, 18, 30, 20);
      g.fillStyle(0xb85c38).fillCircle(5, 10, 5).fillCircle(39, 10, 5); // claws
      g.fillStyle(0x9a4a2a).fillRect(7, 12, 6, 4).fillRect(31, 12, 6, 4);
      g.fillStyle(0xffffff).fillCircle(17, 11, 2.5).fillCircle(27, 11, 2.5);
      g.fillStyle(0x1a1a1a).fillCircle(17, 11, 1.2).fillCircle(27, 11, 1.2);
    });

    this.texture('orb', 12, 12, (g) => {
      g.fillStyle(0xff9f1c).fillCircle(6, 6, 6);
      g.fillStyle(0xffe08a).fillCircle(5, 5, 3);
    });

    this.texture('blast', 14, 14, (g) => {
      g.fillStyle(0xffd60a).fillCircle(7, 7, 7);
      g.fillStyle(0xffffff).fillCircle(7, 7, 3);
    });

    this.texture('sand', 64, 64, (g) => {
      g.fillStyle(0xe6d3a3).fillRect(0, 0, 64, 64);
      for (let i = 0; i < 18; i++) {
        g.fillStyle(i % 2 ? 0xd8c08a : 0xf3e6c4).fillCircle((i * 37) % 64, (i * 23) % 64, 1.5);
      }
    });

    this.texture('palm', 48, 64, (g) => {
      g.fillStyle(0x8b5a2b).fillRect(21, 24, 6, 40);
      g.fillStyle(0x2d8a3e)
        .fillEllipse(12, 22, 26, 10)
        .fillEllipse(36, 22, 26, 10)
        .fillEllipse(24, 14, 12, 26)
        .fillEllipse(14, 14, 22, 9)
        .fillEllipse(34, 14, 22, 9);
    });

    this.texture('rock', 30, 22, (g) => {
      g.fillStyle(0x9c9184).fillEllipse(15, 13, 28, 18);
      g.fillStyle(0xb8ae9f).fillEllipse(12, 10, 14, 8);
    });

    this.scene.start('Title');
  }

  private texture(key: string, width: number, height: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }
}
