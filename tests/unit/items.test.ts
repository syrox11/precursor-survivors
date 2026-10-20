import { describe, expect, it } from 'vitest';
import {
  applyItem, availableItems, ITEMS, ownedOfKind, rollChoices, SLOTS, STARTING_LOADOUT,
  type ItemId, type Loadout,
} from '../../src/logic/items';
import { createRng } from '../../src/logic/rng';

const fullWeapons: Loadout = { spin: 1, scatter: 1, blaster: 1, vulcan: 1, arc: 1 };
const fullPassives: Loadout = { redEco: 1, blueEco: 1, greenEco: 1, armor: 1 };

describe('availableItems', () => {
  it('offers every item except maxed ones at the start', () => {
    expect(availableItems(STARTING_LOADOUT)).toHaveLength(Object.keys(ITEMS).length);
  });

  it('stops offering new weapons once the weapon slots are full', () => {
    const offers = availableItems(fullWeapons);
    expect(offers.filter((id) => ITEMS[id].kind === 'weapon').sort()).toEqual(['arc', 'blaster', 'scatter', 'spin', 'vulcan']);
    expect(offers).toContain('redEco');
  });

  it('stops offering new passives once the passive slots are full', () => {
    const offers = availableItems({ spin: 1, ...fullPassives });
    expect(offers.filter((id) => ITEMS[id].kind === 'passive').sort()).toEqual(['armor', 'blueEco', 'greenEco', 'redEco']);
  });

  it('has no level cap: owned items keep being offered', () => {
    expect(availableItems({ spin: 5 })).toContain('spin');
    expect(availableItems({ spin: 40 })).toContain('spin');
  });

  it('offers only what you own once every slot is full', () => {
    const full: Loadout = { ...fullWeapons, ...fullPassives };
    expect(availableItems(full).sort()).toEqual(Object.keys(full).sort());
  });
});

describe('rollChoices', () => {
  it('offers 3 distinct items', () => {
    const choices = rollChoices(STARTING_LOADOUT, createRng(1));
    expect(choices).toHaveLength(3);
    expect(new Set(choices).size).toBe(3);
  });

  it('is deterministic for a given seed', () => {
    expect(rollChoices(STARTING_LOADOUT, createRng(9))).toEqual(rollChoices(STARTING_LOADOUT, createRng(9)));
  });

  it('offers fewer than 3 when fewer are available', () => {
    const allButArc = (Object.keys(ITEMS) as ItemId[]).filter((id) => id !== 'arc' && id !== 'spin');
    expect(rollChoices({ spin: 1 }, createRng(1), allButArc).sort()).toEqual(['arc', 'spin']);
  });
});

describe('applyItem', () => {
  it('adds a new item at level 1 without mutating the input', () => {
    const next = applyItem(STARTING_LOADOUT, 'arc');
    expect(next.arc).toBe(1);
    expect(STARTING_LOADOUT.arc).toBeUndefined();
  });

  it('levels up an owned item', () => {
    expect(applyItem({ spin: 2 }, 'spin').spin).toBe(3);
  });

  it('keeps levelling past 5', () => {
    expect(applyItem({ spin: 5 }, 'spin')).toEqual({ spin: 6 });
  });

  it('ignores new items once their slots are full', () => {
    expect(applyItem(fullWeapons, 'peacemaker')).toEqual(fullWeapons);
  });

  it('keeps pick order, which the HUD uses for slot order', () => {
    let loadout: Loadout = STARTING_LOADOUT;
    for (const id of ['arc', 'redEco', 'scatter'] as ItemId[]) loadout = applyItem(loadout, id);
    expect(ownedOfKind(loadout, 'weapon')).toEqual(['spin', 'arc', 'scatter']);
    expect(ownedOfKind(loadout, 'passive')).toEqual(['redEco']);
  });
});

describe('a long run', () => {
  it('fills every slot and still has three offers after 100 level-ups', () => {
    const rng = createRng(123);
    let loadout: Loadout = STARTING_LOADOUT;
    for (let i = 0; i < 100; i++) loadout = applyItem(loadout, rollChoices(loadout, rng)[0]);
    expect(ownedOfKind(loadout, 'weapon')).toHaveLength(SLOTS.weapon);
    expect(ownedOfKind(loadout, 'passive')).toHaveLength(SLOTS.passive);
    expect(rollChoices(loadout, rng)).toHaveLength(3);
  });
});
