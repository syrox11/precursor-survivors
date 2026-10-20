import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/logic/rng';
import {
  activeEntries, damageMultiplier, hordeSize, hpMultiplier, pickEnemy, spawnInterval, type SpawnEntry,
} from '../../src/logic/waves';

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

describe('spawn pools', () => {
  const pool: SpawnEntry[] = [{ enemy: 'lurkerPuppy', weight: 3 }, { enemy: 'lurkerCrab', weight: 1, after: 60 }];

  it('ignores entries that have not started yet', () => {
    expect(activeEntries(pool, 59).map((e) => e.enemy)).toEqual(['lurkerPuppy']);
    const rng = createRng(5);
    for (let i = 0; i < 100; i++) expect(pickEnemy(pool, 10, rng).id).toBe('lurkerPuppy');
  });

  it('spawns every active entry eventually, roughly by weight', () => {
    const rng = createRng(11);
    const picks = Array.from({ length: 2000 }, () => pickEnemy(pool, 60, rng).id);
    const crabs = picks.filter((id) => id === 'lurkerCrab').length / picks.length;
    expect(crabs).toBeGreaterThan(0.2);
    expect(crabs).toBeLessThan(0.3);
  });
});
