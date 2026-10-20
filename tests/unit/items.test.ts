import { describe, expect, it } from 'vitest';
import {
  applyItem, availableItems, ITEMS, ownedOfKind, rollChoices, SLOTS, STARTING_LOADOUT,
  type ItemId, type Loadout,
} from '../../src/logic/items';
import { createRng } from '../../src/logic/rng';

const fullWeapons: Loadout = { spin: 1, scatter: 1, blaster: 1, vulcan: 1 };
const fullPassives: Loadout = { redEco: 1, blueEco: 1, greenEco: 1, armor: 1 };

describe('availableItems', () => {
  it('offers every item except maxed ones at the start', () => {
    expect(availableItems(STARTING_LOADOUT)).toHaveLength(Object.keys(ITEMS).length);
  });

  it('stops offering new weapons once the weapon slots are full', () => {
    const offers = availableItems(fullWeapons);
    expect(offers.filter((id) => ITEMS[id].kind === 'weapon').sort()).toEqual(['blaster', 'scatter', 'spin', 'vulcan']);
    expect(offers).toContain('redEco');
  });

  it('stops offering new passives once the passive slots are full', () => {
    const offers = availableItems({ spin: 1, ...fullPassives });
    expect(offers.filter((id) => ITEMS[id].kind === 'passive').sort()).toEqual(['armor', 'blueEco', 'greenEco', 'redEco']);
  });

  it('drops owned items once they reach max level', () => {
    expect(availableItems({ spin: 5 })).not.toContain('spin');
  });

  it('is empty when every slot is full and maxed', () => {
    const maxed = Object.fromEntries(Object.keys({ ...fullWeapons, ...fullPassives }).map((id) => [id, 5])) as Loadout;
    expect(availableItems(maxed)).toEqual([]);
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

  it('offers fewer than 3 when fewer are left', () => {
    const maxedButOne: Loadout = { spin: 5, scatter: 5, blaster: 5, vulcan: 4, redEco: 5, blueEco: 5, greenEco: 5, armor: 5 };
    expect(rollChoices(maxedButOne, createRng(1))).toEqual(['vulcan']);
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

  it('ignores items that are not available', () => {
    expect(applyItem({ spin: 5 }, 'spin')).toEqual({ spin: 5 });
    expect(applyItem(fullWeapons, 'arc')).toEqual(fullWeapons);
  });

  it('keeps pick order, which the HUD uses for slot order', () => {
    let loadout: Loadout = STARTING_LOADOUT;
    for (const id of ['arc', 'redEco', 'scatter'] as ItemId[]) loadout = applyItem(loadout, id);
    expect(ownedOfKind(loadout, 'weapon')).toEqual(['spin', 'arc', 'scatter']);
    expect(ownedOfKind(loadout, 'passive')).toEqual(['redEco']);
  });
});

describe('a full run', () => {
  it('can level until every slot is full and maxed, then offers nothing', () => {
    const rng = createRng(123);
    let loadout: Loadout = STARTING_LOADOUT;
    let picks = 0;
    for (let choices = rollChoices(loadout, rng); choices.length > 0; choices = rollChoices(loadout, rng)) {
      loadout = applyItem(loadout, choices[0]);
      picks++;
    }
    expect(ownedOfKind(loadout, 'weapon')).toHaveLength(SLOTS.weapon);
    expect(ownedOfKind(loadout, 'passive')).toHaveLength(SLOTS.passive);
    // 8 items x 5 levels, minus the level of Spin Kick you start with
    expect(picks).toBe(39);
  });
});
