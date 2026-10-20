import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, getStorage } from '../config';
import { COLOR_NAMES, GUN_COLORS, SHOP_WEAPONS } from '../logic/arsenal';
import { ITEMS, type WeaponId } from '../logic/items';
import { CHALLENGES, COMPANIONS, POWER_UPS, SKINS, WEAPON_UNLOCK_COST, type PowerUpId, type SkinId } from '../logic/meta';
import { buy, loadSave, priceOf, writeSave, type Purchase, type SaveData } from '../logic/save';
import { addButton } from '../ui/button';

type Tab = 'powerUps' | 'weapons' | 'morphGun' | 'companions' | 'skins';

interface Row {
  name: string;
  description: string;
  /** Shown when there is nothing to buy: "Owned", "Max", how to unlock... */
  status?: string;
  purchase: Purchase;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'powerUps', label: 'Power-ups' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'morphGun', label: 'Morph Gun' },
  { id: 'companions', label: 'Companions' },
  { id: 'skins', label: 'Skins' },
];

export class ShopScene extends Phaser.Scene {
  private save!: SaveData;
  private tab: Tab = 'powerUps';
  private content!: Phaser.GameObjects.Container;

  constructor() {
    super('Shop');
  }

  create(): void {
    this.save = loadSave(getStorage());
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'sand').setOrigin(0).setAlpha(0.15);
    this.content = this.add.container(0, 0);
    this.render();
    addButton(this, 110, GAME_HEIGHT - 36, 'BACK', () => this.scene.start('Title'), { width: 160, color: 0x8d99ae });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
  }

  private rows(): Row[] {
    const s = this.save;
    switch (this.tab) {
      case 'powerUps':
        return [
          ...(Object.keys(POWER_UPS) as PowerUpId[]).map((id): Row => {
            const def = POWER_UPS[id];
            const rank = s.powerUps[id] ?? 0;
            return {
              name: `${def.name}  ${rank}/${def.maxRank}`, description: def.description,
              status: rank >= def.maxRank ? 'Max' : undefined, purchase: { kind: 'powerUp', id },
            };
          }),
          {
            name: `Ban slot  ${s.banSlots}/3`, description: 'Ban one more item from level-up offers',
            status: s.banSlots >= 3 ? 'Max' : undefined, purchase: { kind: 'banSlot' },
          },
        ];
      case 'weapons':
        return (Object.keys(WEAPON_UNLOCK_COST) as WeaponId[]).filter((id) => !SHOP_WEAPONS.includes(id)).map((id) => ({
          name: ITEMS[id].name, description: `Start a run with it. ${ITEMS[id].describe(1)}`,
          status: s.weapons.includes(id) ? 'Owned' : undefined, purchase: { kind: 'weapon', id },
        }));
      case 'morphGun':
        return SHOP_WEAPONS.map((id) => ({
          name: ITEMS[id].name,
          description: `${COLOR_NAMES[GUN_COLORS[id]!]}. ${ITEMS[id].describe(1)}`,
          status: s.weapons.includes(id) ? 'Owned' : undefined, purchase: { kind: 'weapon', id },
        }));
      case 'companions':
        return Object.values(COMPANIONS).map((def) => ({
          name: def.name, description: def.description,
          status: s.companions.includes(def.id) ? 'Owned' : undefined, purchase: { kind: 'companion', id: def.id },
        }));
      case 'skins':
        return (Object.keys(SKINS) as SkinId[]).map((id) => {
          const challenge = Object.values(CHALLENGES).find((c) => c.unlocksSkin === id);
          const owned = s.skins.includes(id);
          return {
            name: SKINS[id].name,
            description: challenge ? `Challenge: ${challenge.description}` : 'Cosmetic',
            status: owned ? 'Owned' : challenge ? 'Locked' : undefined,
            purchase: { kind: 'skin', id },
          };
        });
    }
  }

  private render(): void {
    this.content.removeAll(true);
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T) => {
      this.content.add(obj);
      return obj;
    };

    add(this.add.text(40, 26, 'SHOP', { fontFamily: FONT, fontSize: '34px', color: COLORS.accent, fontStyle: 'bold' })
      .setStroke('#3a2a10', 6));
    add(this.add.text(GAME_WIDTH - 40, 34, `Precursor batteries: ${this.save.batteries}`, {
      fontFamily: FONT, fontSize: '20px', color: COLORS.accent, fontStyle: 'bold',
    }).setOrigin(1, 0));

    TABS.forEach((tab, i) => {
      const active = tab.id === this.tab;
      add(addButton(this, 115 + i * 182, 100, tab.label, () => {
        this.tab = tab.id;
        this.render();
      }, { width: 170, height: 36, fontSize: 16, color: active ? 0xffb703 : 0x4a5a60 }).container);
    });

    this.rows().forEach((row, i) => {
      const y = 140 + i * 40;
      add(this.add.rectangle(40, y, GAME_WIDTH - 80, 36, COLORS.panel, 0.85).setOrigin(0));
      add(this.add.text(56, y + 18, row.name, { fontFamily: FONT, fontSize: '17px', color: COLORS.text, fontStyle: 'bold' })
        .setOrigin(0, 0.5));
      add(this.add.text(330, y + 18, row.description, { fontFamily: FONT, fontSize: '14px', color: COLORS.text })
        .setOrigin(0, 0.5).setAlpha(0.8));

      const price = priceOf(this.save, row.purchase);
      if (row.status || price === null) {
        add(this.add.text(GAME_WIDTH - 110, y + 18, row.status ?? '', {
          fontFamily: FONT, fontSize: '15px', color: COLORS.accent,
        }).setOrigin(0.5));
        return;
      }
      add(addButton(this, GAME_WIDTH - 110, y + 18, `${price} ⚡`, () => this.purchase(row.purchase), {
        width: 120, height: 30, fontSize: 15, disabled: price > this.save.batteries,
      }).container);
    });
  }

  private purchase(purchase: Purchase): void {
    const next = buy(this.save, purchase);
    if (!next) return;
    this.save = next;
    writeSave(getStorage(), next);
    this.render();
  }
}
