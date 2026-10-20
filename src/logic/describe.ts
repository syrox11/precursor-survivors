import { ITEMS, type ItemId, type PassiveId, type WeaponId } from './items';
import { MAX_ARMOR, PASSIVE_EFFECTS } from './stats';
import { weaponStats } from './weapons';

/** Concrete, numbers-first text for items: level-up cards (what changes) and tooltips (where it is now). */

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;
const seconds = (value: number) => `${value.toFixed(2)}s`;
const number = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

/** How each weapon stat reads, in display order. Stats not listed (spread, range) are internal and not shown. */
const WEAPON_STAT_LABELS: Partial<Record<string, { label: string; format: (v: number) => string }>> = {
  damage: { label: 'Damage', format: number },
  cooldown: { label: 'Every', format: seconds },
  radius: { label: 'Radius', format: number },
  count: { label: 'Blasts', format: number },
  pellets: { label: 'Pellets', format: number },
  pierce: { label: 'Pierces', format: (v) => (v === 1 ? '1 enemy' : `${v} enemies`) },
  burst: { label: 'Bullets per burst', format: number },
  chains: { label: 'Jumps', format: number },
  stun: { label: 'Stun', format: seconds },
  burn: { label: 'Burn damage', format: (v) => `${number(v)} / 0.5s` },
  burnSeconds: { label: 'Burn time', format: seconds },
  bounces: { label: 'Bounces', format: number },
  seconds: { label: 'Lasts', format: seconds },
  fireEvery: { label: 'Fires every', format: seconds },
  needles: { label: 'Needles', format: number },
  hpShare: { label: 'Slam', format: (v) => `${percent(v)} of max health` },
};

interface StatLine {
  label: string;
  /** The formatted value, e.g. "0.46s" or "+45%". */
  shown: string;
}

function weaponLines(id: WeaponId, level: number): StatLine[] {
  const stats = weaponStats(id, level) as Record<string, number>;
  return Object.entries(WEAPON_STAT_LABELS).flatMap(([key, spec]) =>
    spec && key in stats ? [{ label: spec.label, shown: spec.format(stats[key]) }] : []);
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

function linesFor(id: ItemId, level: number): StatLine[] {
  return ITEMS[id].kind === 'weapon' ? weaponLines(id as WeaponId, level) : passiveLines(id as PassiveId, level);
}

/**
 * Level-up card text for taking `id` at `nextLevel`: the summary and key numbers for a new item,
 * otherwise what changes, e.g. "Damage 13 → 16" and "Every 0.46s → 0.42s".
 */
export function describeUpgrade(id: ItemId, nextLevel: number, maxLines = 3): string {
  const now = linesFor(id, nextLevel);
  if (nextLevel === 1) {
    const key = now.slice(0, 2).map((l) => `${l.label} ${l.shown}`).join(' · ');
    return `${ITEMS[id].summary}\n${key}`;
  }
  const before = linesFor(id, nextLevel - 1);
  const changes = now.flatMap((line) => {
    const old = before.find((b) => b.label === line.label);
    return old && old.shown !== line.shown ? [`${line.label} ${old.shown} → ${line.shown}`] : [];
  });
  return changes.slice(0, maxLines).join('\n');
}

/** Tooltip text for an item you own at `level`: summary plus every stat as it is now. */
export function describeItem(id: ItemId, level: number): string {
  return [ITEMS[id].summary, ...linesFor(id, level).map((l) => `${l.label} ${l.shown}`)].join('\n');
}
