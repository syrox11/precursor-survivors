import { describe, expect, it } from 'vitest';
import { formatTime, loadBestTime, saveBestTime, type KeyValueStore } from '../../src/logic/records';

const memoryStore = (): KeyValueStore => {
  const data = new Map<string, string>();
  return {
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

describe('best time', () => {
  it('is 0 when nothing was saved', () => {
    expect(loadBestTime(memoryStore())).toBe(0);
  });

  it('only saves times that beat the record', () => {
    const store = memoryStore();
    expect(saveBestTime(store, 90)).toBe(true);
    expect(saveBestTime(store, 60)).toBe(false);
    expect(loadBestTime(store)).toBe(90);
  });

  it('survives missing or blocked storage', () => {
    expect(loadBestTime(undefined)).toBe(0);
    expect(loadBestTime(blockedStore)).toBe(0);
    expect(saveBestTime(blockedStore, 30)).toBe(true);
  });
});

describe('formatTime', () => {
  it.each([
    [0, '00:00'],
    [59.9, '00:59'],
    [61, '01:01'],
    [600, '10:00'],
    [-3, '00:00'],
  ])('%s -> %s', (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });
});
