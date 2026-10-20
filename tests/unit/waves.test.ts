import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/logic/rng';
import { damageMultiplier, hordeSize, hpMultiplier, pickEnemy, spawnInterval, unlockedEnemies } from '../../src/logic/waves';

describe('spawnInterval', () => {
  it('starts at one enemy every 0.55 seconds', () => {
    expect(spawnInterval(0)).toBe(0.55);
  });

  it('gets faster over time but never below the floor', () => {
    expect(spawnInterval(120)).toBeLessThan(spawnInterval(60));
    expect(spawnInterval(10_000)).toBe(0.07);
  });
});

describe('scaling', () => {
  it('starts enemy HP and damage at x1', () => {
    expect(hpMultiplier(0)).toBe(1);
    expect(damageMultiplier(0)).toBe(1);
  });

  it('keeps the first two minutes gentle', () => {
    expect(hpMultiplier(120)).toBeLessThan(2);
  });

  it('grows HP faster later in the run', () => {
    const firstFive = hpMultiplier(300) - hpMultiplier(0);
    const lastFive = hpMultiplier(600) - hpMultiplier(300);
    expect(lastFive).toBeGreaterThan(firstFive);
    expect(hpMultiplier(600)).toBeGreaterThan(10);
  });

  it('gives x2.5 contact damage at 10 minutes', () => {
    expect(damageMultiplier(600)).toBe(2.5);
  });
});

describe('hordeSize', () => {
  it('sends nothing during the first two minutes', () => {
    expect(hordeSize(59.98, 60.01)).toBe(0);
    expect(hordeSize(0, 119.9)).toBe(0);
  });

  it('sends a horde only on the frame a minute ticks over', () => {
    expect(hordeSize(119.98, 120.01)).toBe(10);
    expect(hordeSize(120.01, 120.03)).toBe(0);
  });

  it('grows each minute', () => {
    expect(hordeSize(179.99, 180.01)).toBe(15);
    expect(hordeSize(599.99, 600.01)).toBe(50);
  });
});

describe('enemy unlocks', () => {
  it('only spawns Lurker Puppies at the start', () => {
    expect(unlockedEnemies(0).map((e) => e.id)).toEqual(['lurkerPuppy']);
    const rng = createRng(5);
    for (let i = 0; i < 100; i++) expect(pickEnemy(10, rng).id).toBe('lurkerPuppy');
  });

  it('adds Babaks at 1:30 and Lurker Crabs at 3:30', () => {
    expect(unlockedEnemies(89).map((e) => e.id)).toEqual(['lurkerPuppy']);
    expect(unlockedEnemies(90).map((e) => e.id)).toEqual(['lurkerPuppy', 'babak']);
    expect(unlockedEnemies(210).map((e) => e.id)).toEqual(['lurkerPuppy', 'babak', 'lurkerCrab']);
  });

  it('spawns every unlocked type eventually', () => {
    const rng = createRng(11);
    const seen = new Set(Array.from({ length: 300 }, () => pickEnemy(300, rng).id));
    expect(seen).toEqual(new Set(['lurkerPuppy', 'babak', 'lurkerCrab']));
  });
});
