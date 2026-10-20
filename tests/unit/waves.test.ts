import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/logic/rng';
import { hpMultiplier, pickEnemy, spawnInterval, unlockedEnemies } from '../../src/logic/waves';

describe('spawnInterval', () => {
  it('starts at one enemy every 0.6 seconds', () => {
    expect(spawnInterval(0)).toBe(0.6);
  });

  it('gets faster over time but never below the floor', () => {
    expect(spawnInterval(120)).toBeLessThan(spawnInterval(60));
    expect(spawnInterval(10_000)).toBe(0.1);
  });
});

describe('hpMultiplier', () => {
  it('doubles enemy HP at two minutes', () => {
    expect(hpMultiplier(0)).toBe(1);
    expect(hpMultiplier(120)).toBe(2);
  });
});

describe('enemy unlocks', () => {
  it('only spawns Lurker Puppies at the start', () => {
    expect(unlockedEnemies(0).map((e) => e.id)).toEqual(['lurkerPuppy']);
    const rng = createRng(5);
    for (let i = 0; i < 100; i++) expect(pickEnemy(10, rng).id).toBe('lurkerPuppy');
  });

  it('adds Babaks at 0:45 and Lurker Crabs at 2:30', () => {
    expect(unlockedEnemies(45).map((e) => e.id)).toEqual(['lurkerPuppy', 'babak']);
    expect(unlockedEnemies(150).map((e) => e.id)).toEqual(['lurkerPuppy', 'babak', 'lurkerCrab']);
  });

  it('spawns every unlocked type eventually', () => {
    const rng = createRng(11);
    const seen = new Set(Array.from({ length: 300 }, () => pickEnemy(300, rng).id));
    expect(seen).toEqual(new Set(['lurkerPuppy', 'babak', 'lurkerCrab']));
  });
});
