import * as Phaser from 'phaser';
import type { Point } from '../combat/types';
import { FONT, PLAYER_RADIUS, WORLD_SIZE } from '../config';
import type { MapDef } from '../logic/maps';
import { NPCS, pickNpcs, type NpcDef } from '../logic/npcs';
import {
  chestDue, DROP_STAYS, MAX_CHESTS, NPC_AT, NPC_STAYS, ORACLE_AT, ORACLE_STAYS, rollChest, zoneEventDue, type ChestContent,
} from '../logic/pickups';
import type { Rng } from '../logic/rng';
import type { IndicatorTarget } from '../ui/indicators';

type FieldObject =
  | { kind: 'chest'; sprite: Phaser.GameObjects.Image }
  | { kind: 'pickup'; sprite: Phaser.GameObjects.Image; content: ChestContent; timeLeft: number }
  | { kind: 'oracle'; sprite: Phaser.GameObjects.Image; timeLeft: number }
  | { kind: 'npc'; sprite: Phaser.GameObjects.Image; timeLeft: number; npc: NpcDef; label: Phaser.GameObjects.Text };

export interface FieldHandlers {
  /** A chest was opened or a dropped pickup collected. */
  onPickup(content: ChestContent, at: Point): void;
  onOracle(at: Point): void;
  onNpc(npc: NpcDef, at: Point): void;
}

const DEPTH = 2.5;
const PICKUP_RADIUS = 26;

/** Chests, Precursor oracles and saga characters that show up around Jak during a run. */
export class Field {
  private objects: FieldObject[] = [];
  private readonly cast: NpcDef[];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly rng: Rng,
    private readonly map: MapDef,
    private readonly handlers: FieldHandlers,
  ) {
    this.cast = pickNpcs(map.id, rng, map.zones.length).map((id) => NPCS[id]);
  }

  update(dt: number, previous: number, elapsed: number, player: Point): void {
    const chests = this.objects.filter((o) => o.kind === 'chest').length;
    if (chestDue(previous, elapsed) && chests < MAX_CHESTS) this.dropChest(this.around(player, 250, 450));

    const oracleZone = zoneEventDue(ORACLE_AT, this.map.zones.length, previous, elapsed);
    if (oracleZone !== undefined) this.spawnOracle(this.around(player, 400, 600));

    const npcZone = zoneEventDue(NPC_AT, this.map.zones.length, previous, elapsed);
    if (npcZone !== undefined && this.cast[npcZone]) this.spawnNpc(this.cast[npcZone], this.around(player, 450, 650));

    for (let i = this.objects.length - 1; i >= 0; i--) {
      const object = this.objects[i];
      const { sprite } = object;
      if (Math.hypot(sprite.x - player.x, sprite.y - player.y) < PICKUP_RADIUS + PLAYER_RADIUS) {
        this.remove(i);
        const at = { x: sprite.x, y: sprite.y };
        if (object.kind === 'chest') this.handlers.onPickup(rollChest(this.rng), at);
        else if (object.kind === 'pickup') this.handlers.onPickup(object.content, at);
        else if (object.kind === 'oracle') this.handlers.onOracle(at);
        else this.handlers.onNpc(object.npc, at);
        continue;
      }
      if (object.kind !== 'chest') {
        object.timeLeft -= dt;
        if (object.timeLeft <= 0) this.remove(i);
      }
    }
  }

  dropChest(at: Point): void {
    const sprite = this.scene.add.image(at.x, at.y, 'chest').setDepth(DEPTH);
    this.scene.tweens.add({ targets: sprite, y: at.y - 4, duration: 600, yoyo: true, repeat: -1 });
    this.objects.push({ kind: 'chest', sprite });
  }

  /** Something an enemy dropped: shows what it is and waits a while before vanishing. */
  dropPickup(content: ChestContent, at: Point): void {
    const sprite = this.scene.add.image(at.x, at.y, `pickup-${content}`).setDepth(DEPTH);
    this.scene.tweens.add({ targets: sprite, scale: 1.15, duration: 500, yoyo: true, repeat: -1 });
    this.objects.push({ kind: 'pickup', sprite, content, timeLeft: DROP_STAYS });
  }

  /** Off-screen characters and oracles, for the edge arrows. */
  targets(): IndicatorTarget[] {
    return this.objects
      .filter((o) => o.kind === 'npc' || o.kind === 'oracle')
      .map((o) => ({ x: o.sprite.x, y: o.sprite.y, color: o.kind === 'npc' ? 0xffb703 : 0x80ffdb }));
  }

  /** Positions of everything on the field, for debug snapshots. */
  snapshot(): { kind: FieldObject['kind']; x: number; y: number }[] {
    return this.objects.map((o) => ({ kind: o.kind, x: o.sprite.x, y: o.sprite.y }));
  }

  private spawnOracle(at: Point): void {
    const sprite = this.scene.add.image(at.x, at.y, 'oracle').setDepth(DEPTH);
    this.objects.push({ kind: 'oracle', sprite, timeLeft: ORACLE_STAYS });
  }

  private spawnNpc(npc: NpcDef, at: Point): void {
    const sprite = this.scene.add.image(at.x, at.y, npc.texture).setDepth(DEPTH).setScale(1.2);
    const label = this.scene.add.text(at.x, at.y - 34, npc.name, {
      fontFamily: FONT, fontSize: '13px', color: '#ffb703', fontStyle: 'bold',
    }).setOrigin(0.5).setStroke('#000000', 3).setDepth(DEPTH);
    this.objects.push({ kind: 'npc', sprite, timeLeft: NPC_STAYS, npc, label });
  }

  private remove(index: number): void {
    const object = this.objects[index];
    this.scene.tweens.killTweensOf(object.sprite);
    object.sprite.destroy();
    if (object.kind === 'npc') object.label.destroy();
    this.objects.splice(index, 1);
  }

  private around(player: Point, min: number, max: number): Point {
    const angle = this.rng() * Math.PI * 2;
    const distance = min + this.rng() * (max - min);
    return {
      x: Phaser.Math.Clamp(player.x + Math.cos(angle) * distance, 60, WORLD_SIZE - 60),
      y: Phaser.Math.Clamp(player.y + Math.sin(angle) * distance, 60, WORLD_SIZE - 60),
    };
  }
}
