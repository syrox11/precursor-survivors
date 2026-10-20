import { describe, expect, it } from 'vitest';
import { createRng, seedFromQuery, shuffle } from '../../src/logic/rng';

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
  });

  it('produces different sequences for different seeds', () => {
    expect(createRng(1)()).not.toEqual(createRng(2)());
  });

  it('stays within [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('seedFromQuery', () => {
  it.each([
    ['?seed=123', 123],
    ['?foo=1&seed=-5', -5],
    ['', undefined],
    ['?seed=', undefined],
    ['?seed=abc', undefined],
    ['?seed=1.5', undefined],
  ])('%s -> %s', (query, expected) => {
    expect(seedFromQuery(query)).toBe(expected);
  });
});

describe('shuffle', () => {
  it('keeps every item and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(createRng(3), input);
    expect([...result].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
