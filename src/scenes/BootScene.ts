import * as Phaser from 'phaser';
import type { SkinId } from '../logic/meta';

interface JakLook {
  skin: number;
  hair: number;
  tunic: number;
  legs: number;
  goggles: number;
  eyes: number;
  /** Jak II onwards. */
  goatee?: number;
  /** Jak 3 wasteland scarf. */
  scarf?: number;
  /** Dark Jak horns. */
  horns?: number;
  /** Light Jak glow. */
  glow?: number;
}

const JAK_LOOKS: Record<SkinId, JakLook> = {
  jak1: { skin: 0xf0c090, hair: 0x3fbf5f, tunic: 0x2f6fb0, legs: 0x3b2a1a, goggles: 0xd9a441, eyes: 0x1a1a1a },
  jak2: { skin: 0xf0c090, hair: 0x3fbf5f, tunic: 0x40525e, legs: 0x22303a, goggles: 0x9a9a9a, eyes: 0x1a1a1a, goatee: 0x6fae3f },
  jak3: { skin: 0xd9a877, hair: 0x3fbf5f, tunic: 0xb08850, legs: 0x5c4326, goggles: 0xd9a441, eyes: 0x1a1a1a, goatee: 0x6fae3f, scarf: 0xc0392b },
  darkJak: { skin: 0xd8d8e0, hair: 0xeeeef5, tunic: 0x2b2140, legs: 0x15101f, goggles: 0x2b2140, eyes: 0x000000, horns: 0x1a1a1a },
  lightJak: { skin: 0xbdeeff, hair: 0xffffff, tunic: 0x5ec8ff, legs: 0x2f80b0, goggles: 0xbdeeff, eyes: 0x0077b6, glow: 0x90e0ef },
};

function drawJak(g: Phaser.GameObjects.Graphics, look: JakLook): void {
  if (look.glow) g.fillStyle(look.glow, 0.35).fillCircle(16, 20, 16);
  g.fillStyle(look.legs).fillRect(9, 30, 5, 10).fillRect(18, 30, 5, 10);
  g.fillStyle(look.tunic).fillRoundedRect(6, 16, 20, 17, 5);
  if (look.scarf) g.fillStyle(look.scarf).fillRect(7, 17, 18, 4);
  g.fillStyle(look.skin).fillCircle(16, 12, 8);
  if (look.horns) g.fillStyle(look.horns).fillTriangle(7, 8, 4, -2, 11, 5).fillTriangle(25, 8, 28, -2, 21, 5);
  g.fillStyle(look.hair).fillTriangle(6, 10, 16, -2, 26, 10).fillTriangle(16, 6, 30, 0, 24, 12);
  g.fillStyle(look.goggles).fillRect(8, 7, 16, 3);
  if (look.goatee) g.fillStyle(look.goatee).fillTriangle(13, 17, 19, 17, 16, 22);
  g.fillStyle(look.eyes).fillCircle(13, 13, look.horns ? 2.2 : 1.5).fillCircle(19, 13, look.horns ? 2.2 : 1.5);
}

function drawDaxter(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xe8862a).fillCircle(10, 12, 7);
  g.fillTriangle(3, 8, 6, 0, 9, 7).fillTriangle(11, 7, 14, 0, 17, 8); // ears
  g.fillStyle(0xfbe3c0).fillCircle(10, 14, 4);
  g.fillStyle(0x1a1a1a).fillCircle(8, 11, 1.2).fillCircle(12, 11, 1.2);
}

/**
 * Placeholder art drawn with shapes at startup, so phase 1 needs no image files.
 * Each texture key is what the real sprite will replace later.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    for (const [skin, look] of Object.entries(JAK_LOOKS)) {
      this.texture(`jak-${skin}`, 32, 40, (g) => drawJak(g, look));
    }

    this.texture('daxter', 20, 20, drawDaxter);

    this.texture('daxterPants', 20, 26, (g) => {
      drawDaxter(g);
      g.fillStyle(0x3d5a80).fillRect(4, 17, 12, 5).fillRect(4, 21, 5, 5).fillRect(11, 21, 5, 5); // pants
      g.fillStyle(0xe8862a).fillRect(6, 15, 8, 3);
    });

    this.texture('pecker', 24, 20, (g) => {
      g.fillStyle(0x3a86ff).fillEllipse(12, 11, 18, 14); // body
      g.fillStyle(0xffd60a).fillTriangle(2, 8, 10, 10, 4, 16).fillTriangle(22, 8, 14, 10, 20, 16); // wings
      g.fillStyle(0xf4a261).fillTriangle(10, 8, 14, 8, 12, 14); // beak
      g.fillStyle(0xffffff).fillCircle(9, 6, 2.5).fillCircle(15, 6, 2.5);
      g.fillStyle(0x1a1a1a).fillCircle(9, 6, 1.2).fillCircle(15, 6, 1.2);
    });

    this.texture('clank', 20, 26, (g) => {
      g.fillStyle(0x6c757d).fillRect(9, 0, 2, 5); // antenna
      g.fillStyle(0xe63946).fillCircle(10, 1.5, 1.5);
      g.fillStyle(0xadb5bd).fillRoundedRect(3, 4, 14, 10, 4); // head
      g.fillStyle(0x80ed99).fillCircle(7.5, 9, 2).fillCircle(12.5, 9, 2); // eyes
      g.fillStyle(0x8d99ae).fillRoundedRect(5, 15, 10, 8, 2); // body
      g.fillStyle(0x6c757d).fillRect(6, 23, 3, 3).fillRect(11, 23, 3, 3);
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

    this.texture('pellet', 10, 10, (g) => {
      g.fillStyle(0xe5383b).fillCircle(5, 5, 5);
      g.fillStyle(0xffb3b3).fillCircle(4, 4, 2);
    });

    this.texture('bolt', 18, 6, (g) => {
      g.fillStyle(0xffa62b).fillRoundedRect(0, 0, 18, 6, 3);
      g.fillStyle(0xfff3c4).fillRoundedRect(6, 1, 11, 4, 2);
    });

    this.texture('vulcanShot', 8, 8, (g) => {
      g.fillStyle(0x4cc9f0).fillCircle(4, 4, 4);
      g.fillStyle(0xffffff).fillCircle(4, 4, 1.5);
    });

    this.texture('peacemakerOrb', 24, 24, (g) => {
      g.fillStyle(0x5a189a, 0.6).fillCircle(12, 12, 12);
      g.fillStyle(0x9d4edd).fillCircle(12, 12, 8);
      g.fillStyle(0xe0aaff).fillCircle(12, 12, 4);
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
