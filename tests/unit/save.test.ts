import { describe, expect, it } from 'vitest';
import { POWER_CELL_BONUS } from '../../src/logic/meta';
import {
  buy, defaultSave, LEGACY_BEST_TIME_KEY, loadSave, parseSave, priceOf, recordRun, SAVE_KEY, writeSave,
  type KeyValueStore, type SaveData,
} from '../../src/logic/save';

const memoryStore = (initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
};

const blockedStore: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

const rich = (batteries = 1000): SaveData => ({ ...defaultSave(), batteries });
const run = (overrides: Partial<{ won: boolean; time: number; kills: number; level: number }> = {}) => ({
  won: false, time: 0, kills: 0, level: 1, ...overrides,
});

describe('loading and saving', () => {
  it('starts with the defaults when nothing is saved', () => {
    expect(loadSave(memoryStore())).toEqual(defaultSave());
  });

  it('round-trips a save', () => {
    const store = memoryStore();
    const save = { ...buy(rich(), { kind: 'companion', id: 'clank' })!, bestTime: 321 };
    writeSave(store, save);
    expect(loadSave(store)).toEqual(save);
  });

  it('works without storage or with blocked storage', () => {
    expect(loadSave(undefined)).toEqual(defaultSave());
    expect(loadSave(blockedStore)).toEqual(defaultSave());
    expect(() => writeSave(blockedStore, defaultSave())).not.toThrow();
  });

  it('survives corrupt JSON', () => {
    expect(parseSave('{not json')).toEqual(defaultSave());
  });

  it('migrates the best time from phases 1-2', () => {
    const store = memoryStore({ [LEGACY_BEST_TIME_KEY]: '245' });
    expect(loadSave(store).bestTime).toBe(245);
  });

  it('drops unknown ids, negative numbers and out-of-range ranks', () => {
    const save = parseSave(JSON.stringify({
      batteries: -50,
      weapons: ['bfg', 'arc'],
      companions: ['jinx'],
      powerUps: { might: 99, vitality: -1, laser: 3 },
      banSlots: 7,
    }));
    expect(save.batteries).toBe(0);
    expect(save.weapons).toEqual(['spin', 'arc']);
    expect(save.companions).toEqual(['daxter']);
    expect(save.powerUps).toEqual({ might: 5 });
    expect(save.banSlots).toBe(3);
  });

  it('never loads a setup with locked content', () => {
    const save = parseSave(JSON.stringify({
      setup: { weapon: 'arc', companion: 'clank', skin: 'darkJak', banned: ['blaster'] },
    }));
    expect(save.setup).toEqual(defaultSave().setup);
  });

  it('trims bans to owned slots and never bans the starting weapon', () => {
    const save = parseSave(JSON.stringify({
      banSlots: 2,
      weapons: ['spin', 'arc'],
      setup: { weapon: 'arc', banned: ['arc', 'blaster', 'vulcan', 'redEco'] },
    }));
    expect(save.setup.banned).toEqual(['blaster', 'vulcan']);
  });
});

describe('shop', () => {
  it('charges the price and unlocks the item', () => {
    const next = buy(rich(100), { kind: 'weapon', id: 'arc' })!;
    expect(next.batteries).toBe(20);
    expect(next.weapons).toContain('arc');
  });

  it('refuses when there are not enough batteries', () => {
    expect(buy(rich(10), { kind: 'weapon', id: 'arc' })).toBeNull();
  });

  it('cannot buy something already owned', () => {
    expect(priceOf(rich(), { kind: 'companion', id: 'daxter' })).toBeNull();
    expect(buy(rich(), { kind: 'companion', id: 'daxter' })).toBeNull();
  });

  it('cannot buy challenge-only skins', () => {
    expect(priceOf(rich(), { kind: 'skin', id: 'darkJak' })).toBeNull();
  });

  it('raises power-up prices with each rank and stops at max', () => {
    let save = rich();
    const prices: (number | null)[] = [];
    for (let i = 0; i < 4; i++) {
      prices.push(priceOf(save, { kind: 'powerUp', id: 'swiftness' }));
      save = buy(save, { kind: 'powerUp', id: 'swiftness' }) ?? save;
    }
    expect(prices).toEqual([20, 40, 60, null]);
    expect(save.powerUps.swiftness).toBe(3);
  });

  it('sells up to three ban slots', () => {
    let save = rich();
    for (let i = 0; i < 5; i++) save = buy(save, { kind: 'banSlot' }) ?? save;
    expect(save.banSlots).toBe(3);
    expect(save.batteries).toBe(1000 - 30 - 60 - 90);
  });

  it('does not mutate the save it was given', () => {
    const save = rich();
    buy(save, { kind: 'weapon', id: 'arc' });
    expect(save).toEqual(rich());
  });
});

describe('recordRun', () => {
  it('pays batteries for time and kills', () => {
    const { earned, save } = recordRun(defaultSave(), run({ time: 95, kills: 250 }));
    expect(earned).toBe(3 + 2);
    expect(save.batteries).toBe(5);
    expect(save.runs).toBe(1);
  });

  it('pays the Power Cell bonus and completes the challenge once', () => {
    const first = recordRun(defaultSave(), run({ won: true, time: 600 }));
    expect(first.earned).toBe(20 + POWER_CELL_BONUS);
    expect(first.completed).toEqual(['powerCell']);
    expect(first.save.skins).toContain('darkJak');
    expect(first.save.wins).toBe(1);

    const second = recordRun(first.save, run({ won: true, time: 600 }));
    expect(second.completed).toEqual([]);
  });

  it('adds challenge rewards on top of the run reward', () => {
    const { save, completed } = recordRun(defaultSave(), run({ kills: 1000, level: 30, time: 300 }));
    expect(completed.sort()).toEqual(['exterminator', 'veteran']);
    expect(save.batteries).toBe(10 + 10 + 30 + 30);
    expect(save.skins).toContain('lightJak');
  });

  it('tracks the best time and flags a new record', () => {
    const first = recordRun(defaultSave(), run({ time: 120 }));
    expect(first.newRecord).toBe(true);
    const second = recordRun(first.save, run({ time: 60 }));
    expect(second.newRecord).toBe(false);
    expect(second.save.bestTime).toBe(120);
  });
});

describe('storage keys', () => {
  it('writes under the save key', () => {
    const store = memoryStore();
    writeSave(store, defaultSave());
    expect(store.data.has(SAVE_KEY)).toBe(true);
  });
});
