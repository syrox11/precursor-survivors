import type { WeaponMods } from './arsenal';
import { ITEMS, type ItemId, type PassiveId, type WeaponId } from './items';
import { MAX_ARMOR, PASSIVE_EFFECTS, type PlayerStats } from './stats';
import { effectiveCooldown, weaponStats } from './weapons';

/** Concrete, numbers-first text for items: level-up cards (what changes) and tooltips (where it is now). */

/**
 * Everything that changes a weapon's numbers on top of its own level: the player's passives and power-ups
 * multiplied with the weapon's colour synergy and chest mods. Lets the text show "base" and "total".
 */
export interface Bonus {
  damage: number;
  cooldown: number;
  area: number;
  extra: number;
}

export function weaponBonus(stats: PlayerStats, mods: WeaponMods): Bonus {
  return {
    damage: stats.damageMultiplier * mods.damage,
    cooldown: stats.cooldownMultiplier * mods.cooldown,
    area: stats.areaMultiplier * mods.area,
    extra: mods.extra,
  };
}

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;
const seconds = (value: number) => `${value.toFixed(2)}s`;
const number = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
const rounded = (value: number) => String(Math.round(value));

interface StatSpec {
  label: string;
  format: (v: number) => string;
  /** How bonuses change this stat; stats without it are the same base and total. */
  apply?: (v: number, b: Bonus) => number;
  /** Format for the total when it needs to differ, e.g. damage totals rounded. */
  formatTotal?: (v: number) => string;
}

/** How each weapon stat reads, in display order. Stats not listed (spread, range) are internal and not shown. */
const WEAPON_STATS: Record<string, StatSpec> = {
  damage: { label: 'Damage', format: number, apply: (v, b) => v * b.damage, formatTotal: rounded },
  cooldown: { label: 'Every', format: seconds, apply: (v, b) => effectiveCooldown(v, b.cooldown) },
  radius: { label: 'Radius', format: number, apply: (v, b) => v * b.area, formatTotal: rounded },
  count: { label: 'Blasts', format: number, apply: (v, b) => v + b.extra },
  pellets: { label: 'Pellets', format: number, apply: (v, b) => v + 2 * b.extra },
  pierce: { label: 'Pierces', format: (v) => (v === 1 ? '1 enemy' : `${v} enemies`) },
  burst: { label: 'Bullets per burst', format: number, apply: (v, b) => v + 3 * b.extra },
  chains: { label: 'Jumps', format: number, apply: (v, b) => v + b.extra },
  stun: { label: 'Stun', format: seconds },
  burn: { label: 'Burn damage', format: (v) => `${number(v)} / 0.5s`, apply: (v, b) => v * b.damage, formatTotal: (v) => `${rounded(v)} / 0.5s` },
  burnSeconds: { label: 'Burn time', format: seconds },
  bounces: { label: 'Bounces', format: number, apply: (v, b) => v + b.extra },
  seconds: { label: 'Lasts', format: seconds },
  fireEvery: { label: 'Fires every', format: seconds },
  needles: { label: 'Needles', format: number, apply: (v, b) => v + b.extra },
  hpShare: { label: 'Slam', format: (v) => `${percent(v)} of max health` },
};

interface StatLine {
  label: string;
  /** The formatted base value, e.g. "0.46s" or "+45%". */
  shown: string;
  /** The formatted value with bonuses, when bonuses were given and it differs. */
  total?: string;
}

function weaponLines(id: WeaponId, level: number, bonus?: Bonus): StatLine[] {
  const stats = weaponStats(id, level) as Record<string, number>;
  return Object.entries(WEAPON_STATS).flatMap(([key, spec]) => {
    if (!(key in stats)) return [];
    const value = stats[key];
    const shown = spec.format(value);
    if (!bonus || !spec.apply) return [{ label: spec.label, shown }];
    const total = (spec.formatTotal ?? spec.format)(spec.apply(value, bonus));
    return [{ label: spec.label, shown, total: total !== shown ? total : undefined }];
  });
}

function passiveLines(id: PassiveId, level: number): StatLine[] {
  const fx = PASSIVE_EFFECTS;
  switch (id) {
    case 'redEco': return [{ label: 'Damage', shown: `+${percent(fx.damage(level))}` }];
    case 'blueEco': return [
      { label: 'Speed', shown: `+${percent(fx.speed(level))}` },
      { label: 'Pickup range', shown: `+${percent(fx.pickup(level))}` },
    ];
    case 'greenEco': return [
      { label: 'Max health', shown: `+${fx.maxHp(level)}` },
      { label: 'Regen', shown: `${number(fx.regen(level))} HP/s` },
    ];
    case 'armor': return [{ label: 'Damage taken', shown: `-${percent(Math.min(MAX_ARMOR, fx.armor(level)))}` }];
    case 'amplifier': return [{ label: 'Area', shown: `+${percent(fx.area(level))}` }];
    case 'tuneUp': return [{ label: 'Cooldowns', shown: `-${percent(fx.cooldownCut(level))}` }];
  }
}

function linesFor(id: ItemId, level: number, bonus?: Bonus): StatLine[] {
  return ITEMS[id].kind === 'weapon' ? weaponLines(id as WeaponId, level, bonus) : passiveLines(id as PassiveId, level);
}

const withTotal = (line: StatLine, text: string) => (line.total ? `${text} · total ${line.total}` : text);

/**
 * Level-up card text for taking `id` at `nextLevel`: the summary and key numbers for a new item,
 * otherwise what changes, e.g. "Damage 13 → 16 · total 27". Totals appear when `bonus` is given
 * (it should already include whatever taking the card would add, such as a new colour synergy).
 */
export function describeUpgrade(id: ItemId, nextLevel: number, bonus?: Bonus, maxLines = 3): string {
  const now = linesFor(id, nextLevel, bonus);
  if (nextLevel === 1) {
    const key = now.slice(0, 2).map((l) => withTotal(l, `${l.label} ${l.shown}`));
    return [ITEMS[id].summary, ...key].join('\n');
  }
  const before = linesFor(id, nextLevel - 1);
  const changes = now.flatMap((line) => {
    const old = before.find((b) => b.label === line.label);
    return old && old.shown !== line.shown ? [withTotal(line, `${line.label} ${old.shown} → ${line.shown}`)] : [];
  });
  return changes.slice(0, maxLines).join('\n');
}

/** Tooltip text for an item you own at `level`: summary plus every stat, base and (with `bonus`) total. */
export function describeItem(id: ItemId, level: number, bonus?: Bonus): string {
  return [ITEMS[id].summary, ...linesFor(id, level, bonus).map((l) => withTotal(l, `${l.label} ${l.shown}`))].join('\n');
}
