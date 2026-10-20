import * as Phaser from 'phaser';
import { groundTexture, MAPS, type GroundStyle } from '../logic/maps';
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

function drawHut(g: Phaser.GameObjects.Graphics, walls: number, roof: number): void {
  g.fillStyle(walls).fillRect(8, 26, 40, 28);
  g.fillStyle(roof).fillTriangle(2, 28, 28, 4, 54, 28);
  g.fillStyle(0x2b2d42).fillRect(23, 38, 10, 16); // door
}

function drawGround(g: Phaser.GameObjects.Graphics, style: GroundStyle): void {
  g.fillStyle(style.base).fillRect(0, 0, 64, 64);
  for (let i = 0; i < 18; i++) {
    g.fillStyle(i % 2 ? style.speckA : style.speckB).fillCircle((i * 37) % 64, (i * 23) % 64, 1.5);
  }
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

    this.texture('flyingLurker', 30, 20, (g) => {
      g.fillStyle(0x5a3478).fillTriangle(0, 4, 12, 10, 4, 16).fillTriangle(30, 4, 18, 10, 26, 16); // wings
      g.fillStyle(0x7b4fa0).fillEllipse(15, 11, 14, 14);
      g.fillStyle(0xffd60a).fillCircle(12, 10, 2).fillCircle(18, 10, 2);
    });

    this.texture('boneArmor', 36, 38, (g) => {
      g.fillStyle(0x4a2f66).fillEllipse(18, 22, 32, 30);
      g.fillStyle(0xe9e3d0).fillRoundedRect(6, 12, 24, 14, 5); // bone plate
      g.fillStyle(0xe9e3d0).fillTriangle(6, 12, 9, 0, 14, 11).fillTriangle(22, 11, 27, 0, 30, 12); // tusks
      g.fillStyle(0xe5383b).fillCircle(13, 18, 2.5).fillCircle(23, 18, 2.5);
    });

    this.texture('spider', 22, 16, (g) => {
      g.lineStyle(2, 0x1a1a1a);
      for (const x of [3, 7, 15, 19]) g.lineBetween(11, 9, x, x < 11 ? 2 : 15).lineBetween(11, 9, x, x < 11 ? 15 : 2);
      g.fillStyle(0x2b1d1d).fillEllipse(11, 9, 12, 10);
      g.fillStyle(0xff5400).fillCircle(9, 7, 1.5).fillCircle(13, 7, 1.5);
    });

    this.texture('darkEcoPlant', 84, 84, (g) => {
      g.fillStyle(0x2d6a4f).fillEllipse(20, 66, 36, 16).fillEllipse(64, 66, 36, 16); // leaves
      g.fillStyle(0x40916c).fillRect(38, 40, 8, 34); // stem
      g.fillStyle(0x3c096c).fillCircle(42, 32, 26); // head
      g.fillStyle(0x10002b).fillEllipse(42, 38, 30, 16); // maw
      g.fillStyle(0xe0aaff).fillTriangle(30, 32, 34, 40, 38, 32).fillTriangle(46, 32, 50, 40, 54, 32); // teeth
      g.fillStyle(0x9d4edd).fillCircle(32, 20, 4).fillCircle(52, 20, 4);
    });

    this.texture('klaww', 96, 96, (g) => {
      g.fillStyle(0x6f4518).fillEllipse(48, 58, 84, 70); // body
      g.fillStyle(0x99582a).fillEllipse(48, 64, 50, 40); // belly
      g.fillStyle(0xdda15e).fillTriangle(18, 30, 10, 2, 32, 24).fillTriangle(78, 30, 86, 2, 64, 24); // horns
      g.fillStyle(0x6f4518).fillCircle(10, 60, 14).fillCircle(86, 60, 14); // fists
      g.fillStyle(0xffd60a).fillCircle(36, 40, 5).fillCircle(60, 40, 5);
      g.fillStyle(0x1a1a1a).fillRect(34, 52, 28, 5);
    });

    this.texture('giantSpider', 100, 76, (g) => {
      g.lineStyle(5, 0x1a1010);
      for (const [x, y] of [[4, 10], [0, 38], [6, 70], [96, 10], [100, 38], [94, 70]] as const) g.lineBetween(50, 40, x, y);
      g.fillStyle(0x3b1f1f).fillEllipse(50, 48, 52, 40); // abdomen
      g.fillStyle(0x8c2f1a).fillEllipse(50, 48, 30, 18); // lava stripe
      g.fillStyle(0x2b1d1d).fillCircle(50, 24, 16); // head
      g.fillStyle(0xff5400).fillCircle(44, 20, 3).fillCircle(56, 20, 3).fillCircle(47, 27, 2).fillCircle(53, 27, 2);
    });

    this.texture('golMaiaRobot', 120, 120, (g) => {
      g.fillStyle(0x495057).fillRect(30, 80, 18, 40).fillRect(72, 80, 18, 40); // legs
      g.fillStyle(0x6c757d).fillRoundedRect(14, 34, 92, 56, 14); // body
      g.fillStyle(0x343a40).fillRoundedRect(36, 4, 48, 36, 10); // cockpit
      g.fillStyle(0x7b2cbf).fillCircle(60, 62, 16); // dark eco core
      g.fillStyle(0xe0aaff).fillCircle(60, 62, 7);
      g.fillStyle(0xc77dff).fillCircle(50, 20, 6).fillCircle(70, 20, 6); // Gol and Maia
      g.fillStyle(0x495057).fillCircle(8, 50, 12).fillCircle(112, 50, 12); // shoulders
    });

    this.texture('darkEcoBall', 14, 14, (g) => {
      g.fillStyle(0x3c096c).fillCircle(7, 7, 7);
      g.fillStyle(0xc77dff).fillCircle(7, 7, 3);
    });

    this.texture('boulder', 26, 24, (g) => {
      g.fillStyle(0x6c584c).fillEllipse(13, 12, 26, 22);
      g.fillStyle(0x8d7966).fillEllipse(10, 9, 12, 8);
    });

    this.texture('hut', 56, 56, (g) => drawHut(g, 0x8d99ae, 0x3a86ff));
    this.texture('greenHut', 56, 56, (g) => drawHut(g, 0xc9a66b, 0x38b000));

    this.texture('lavaPool', 70, 40, (g) => {
      g.fillStyle(0x2e2420).fillEllipse(35, 20, 70, 40);
      g.fillStyle(0xe85d04).fillEllipse(35, 20, 56, 28);
      g.fillStyle(0xffba08).fillEllipse(30, 17, 26, 10);
    });

    this.texture('darkRock', 34, 26, (g) => {
      g.fillStyle(0x2b2d42).fillEllipse(17, 15, 32, 22);
      g.fillStyle(0x4a4e69).fillEllipse(13, 11, 14, 8);
    });

    this.texture('pillar', 30, 70, (g) => {
      g.fillStyle(0x4a4e69).fillRect(4, 6, 22, 60);
      g.fillStyle(0x6c63a8).fillRect(0, 0, 30, 8).fillRect(0, 62, 30, 8);
      g.fillStyle(0x80ffdb).fillCircle(15, 34, 4); // precursor light
    });

    // ---- Jak II ----

    this.texture('krimzonGuard', 28, 36, (g) => {
      g.fillStyle(0x3b3b3b).fillRect(8, 28, 5, 8).fillRect(15, 28, 5, 8); // legs
      g.fillStyle(0xb71c1c).fillRoundedRect(4, 12, 20, 18, 4); // red armour
      g.fillStyle(0x8d99ae).fillRoundedRect(6, 0, 16, 14, 6); // helmet
      g.fillStyle(0xffd60a).fillRect(8, 6, 12, 3); // visor
      g.fillStyle(0x6c757d).fillRect(20, 16, 8, 4); // baton
    });

    this.texture('guardGunner', 30, 36, (g) => {
      g.fillStyle(0x3b3b3b).fillRect(8, 28, 5, 8).fillRect(15, 28, 5, 8);
      g.fillStyle(0x7f1d1d).fillRoundedRect(4, 12, 20, 18, 4);
      g.fillStyle(0x8d99ae).fillRoundedRect(6, 0, 16, 14, 6);
      g.fillStyle(0xff5400).fillRect(8, 6, 12, 3);
      g.fillStyle(0x212529).fillRect(16, 17, 14, 5); // rifle
    });

    this.texture('metalGrunt', 32, 32, (g) => {
      g.fillStyle(0x2b2d42).fillEllipse(16, 18, 30, 26);
      g.fillStyle(0x52b788).fillTriangle(4, 10, 8, 0, 12, 9).fillTriangle(20, 9, 24, 0, 28, 10); // horns
      g.fillStyle(0x95d5b2).fillCircle(16, 12, 4); // skull gem
      g.fillStyle(0xe5383b).fillCircle(11, 19, 2).fillCircle(21, 19, 2);
    });

    this.texture('metalFlitter', 28, 20, (g) => {
      g.fillStyle(0x52b788, 0.7).fillTriangle(0, 2, 12, 10, 3, 18).fillTriangle(28, 2, 16, 10, 25, 18);
      g.fillStyle(0x2b2d42).fillEllipse(14, 10, 12, 14);
      g.fillStyle(0x95d5b2).fillCircle(14, 7, 2.5);
    });

    this.texture('metalBrute', 44, 40, (g) => {
      g.fillStyle(0x1b1c2b).fillEllipse(22, 24, 42, 32);
      g.fillStyle(0x495057).fillRoundedRect(8, 10, 28, 12, 4); // metal plating
      g.fillStyle(0x52b788).fillTriangle(6, 14, 2, 0, 14, 10).fillTriangle(38, 14, 42, 0, 30, 10);
      g.fillStyle(0x95d5b2).fillCircle(22, 16, 5);
      g.fillStyle(0xe5383b).fillCircle(15, 26, 2.5).fillCircle(29, 26, 2.5);
    });

    this.texture('errol', 70, 50, (g) => {
      g.fillStyle(0x495057).fillRoundedRect(0, 30, 70, 14, 7); // hover bike
      g.fillStyle(0xff5400).fillRect(2, 44, 66, 4); // thrusters
      g.fillStyle(0xb71c1c).fillRoundedRect(22, 10, 26, 24, 6); // Errol's armour
      g.fillStyle(0xf0c090).fillCircle(35, 8, 8);
      g.fillStyle(0xe63946).fillCircle(38, 7, 2.5); // cybernetic eye
      g.fillStyle(0xd9a441).fillTriangle(27, 4, 35, -2, 43, 4); // hair
    });

    this.texture('krew', 96, 90, (g) => {
      g.fillStyle(0x495057).fillEllipse(48, 78, 80, 20); // hover chair
      g.fillStyle(0x80b918).fillEllipse(48, 50, 84, 60); // body
      g.fillStyle(0xaacc00).fillEllipse(48, 58, 50, 34);
      g.fillStyle(0x80b918).fillCircle(48, 20, 18); // head
      g.fillStyle(0x1a1a1a).fillCircle(42, 18, 2.5).fillCircle(54, 18, 2.5);
      g.fillStyle(0xd62828).fillRect(40, 0, 16, 6); // fez
      g.fillStyle(0x6c757d).fillCircle(8, 48, 8).fillCircle(88, 48, 8); // rings
    });

    this.texture('praxis', 56, 64, (g) => {
      g.fillStyle(0x7f1d1d).fillTriangle(4, 60, 28, 14, 52, 60); // cape
      g.fillStyle(0x6c757d).fillRoundedRect(14, 18, 28, 32, 6); // armour
      g.fillStyle(0xadb5bd).fillRect(10, 18, 36, 8); // shoulders
      g.fillStyle(0x343a40).fillRect(18, 50, 8, 14).fillRect(30, 50, 8, 14);
      g.fillStyle(0xd9a877).fillCircle(28, 11, 9);
      g.fillStyle(0x6c757d).fillRect(19, 2, 18, 6); // helmet
      g.fillStyle(0xadb5bd).fillCircle(28, 34, 5); // emblem
    });

    this.texture('metalKor', 124, 110, (g) => {
      g.fillStyle(0x1b1c2b).fillEllipse(62, 66, 116, 84); // body
      g.fillStyle(0x52b788).fillTriangle(20, 40, 4, 0, 40, 28).fillTriangle(104, 40, 120, 0, 84, 28); // horns
      g.fillStyle(0x2b2d42).fillEllipse(62, 70, 70, 44);
      g.fillStyle(0x95d5b2).fillCircle(62, 36, 16); // the big skull gem
      g.fillStyle(0xd8f3dc).fillCircle(58, 32, 6);
      g.fillStyle(0xe5383b).fillCircle(46, 60, 5).fillCircle(78, 60, 5);
    });

    this.texture('laserBolt', 16, 6, (g) => {
      g.fillStyle(0xff5400).fillRoundedRect(0, 0, 16, 6, 3);
      g.fillStyle(0xffd60a).fillRoundedRect(4, 1, 10, 4, 2);
    });

    this.texture('lamp', 20, 60, (g) => {
      g.fillStyle(0x495057).fillRect(8, 10, 4, 50);
      g.fillStyle(0xffd60a, 0.35).fillCircle(10, 8, 10);
      g.fillStyle(0xffe066).fillCircle(10, 8, 4);
    });

    this.texture('crate', 30, 30, (g) => {
      g.fillStyle(0x8d6e4b).fillRect(0, 0, 30, 30);
      g.lineStyle(3, 0x5c4326).strokeRect(2, 2, 26, 26).lineBetween(2, 2, 28, 28);
    });

    this.texture('pipe', 80, 22, (g) => {
      g.fillStyle(0x5c6b5a).fillRoundedRect(0, 4, 80, 14, 7);
      g.fillStyle(0x3f4a3c).fillRect(18, 2, 6, 18).fillRect(56, 2, 6, 18); // joints
    });

    this.texture('puddle', 60, 30, (g) => {
      g.fillStyle(0x6a994e, 0.6).fillEllipse(30, 15, 60, 28);
      g.fillStyle(0xa7c957, 0.5).fillEllipse(24, 12, 20, 8);
    });

    this.texture('statue', 34, 64, (g) => {
      g.fillStyle(0x8c7448).fillRect(2, 54, 30, 10); // plinth
      g.fillStyle(0xd6c08f).fillRoundedRect(8, 16, 18, 38, 4);
      g.fillStyle(0xd6c08f).fillCircle(17, 10, 9);
      g.fillStyle(0x80ffdb).fillCircle(17, 10, 3); // precursor glow
    });

    this.texture('torch', 16, 40, (g) => {
      g.fillStyle(0x5c4326).fillRect(6, 14, 4, 26);
      g.fillStyle(0xff5400).fillTriangle(2, 14, 8, 0, 14, 14);
      g.fillStyle(0xffd60a).fillTriangle(5, 14, 8, 5, 11, 14);
    });

    this.texture('eggPod', 36, 40, (g) => {
      g.fillStyle(0x2d6a4f).fillEllipse(18, 22, 32, 36);
      g.fillStyle(0x95d5b2, 0.6).fillEllipse(18, 18, 16, 20);
      g.fillStyle(0x1b4332).fillRect(6, 34, 24, 6);
    });

    for (const map of Object.values(MAPS)) {
      map.zones.forEach((zone, i) => {
        this.texture(groundTexture(map.id, i), 64, 64, (g) => drawGround(g, zone.ground));
      });
    }

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
