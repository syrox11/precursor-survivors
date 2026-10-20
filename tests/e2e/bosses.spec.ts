import { expect, test } from './support/fixtures';

const FIRST_BOSSES = [
  { map: 'jak1', boss: 'Dark Eco Plant' },
  { map: 'jak2', boss: 'Errol' },
  { map: 'jak3', boss: 'Metal Head Dinosaur' },
] as const;

test.describe('bosses', () => {
  for (const { map, boss } of FIRST_BOSSES) {
    test(`${map}: the first boss, ${boss}, shows up at 2:00`, async ({ game }) => {
      await game.startRun({ god: true, map, t: 116 });

      const s = await game.waitUntil((run) => run.bosses.length > 0, { message: `${boss} to appear` });
      expect(s.bosses[0].name).toBe(boss);
      expect(s.elapsed).toBeGreaterThanOrEqual(120);
      expect(s.elapsed).toBeLessThan(123);
    });
  }

  test('a strong build brings the first boss down and Jak keeps the orbs', async ({ game }) => {
    await game.startRun({ god: true, t: 118, items: { vulcan: 5, blaster: 5, arc: 5, redEco: 5 } });

    const s = await game.waitUntil((run) => run.bossesDefeated === 1, { timeout: 90_000, message: 'the boss to fall' });
    expect(s.bosses).toEqual([]);
    expect(s.orbs.length, 'a shower of orbs where it fell').toBeGreaterThan(0);
  });
});

test.describe('endless mode', () => {
  test('starts with the Power Cell earned and brings a boss back every 30 seconds', async ({ game }) => {
    await game.startRun({ god: true, endless: true, items: { vulcan: 6, arc: 6 } });

    const start = await game.waitUntil((s) => s.victory, { message: 'the Power Cell' });
    const boss = await game.waitUntil((s) => s.bosses.length > 0, { timeout: 90_000, message: 'a returning boss' });
    expect(boss.elapsed - start.elapsed).toBeLessThan(33);
    expect(boss.state).toBe('playing');
  });

  test('oracles and characters keep showing up', async ({ game }) => {
    await game.startRun({ god: true, endless: true, items: { vulcan: 6, arc: 6 } });

    const npc = await game.waitUntil((s) => s.field.some((f) => f.kind === 'npc'), { timeout: 90_000, message: 'a character' });
    const oracle = await game.waitUntil((s) => s.field.some((f) => f.kind === 'oracle'), { timeout: 90_000, message: 'an oracle' });
    expect(oracle.elapsed).toBeGreaterThan(npc.elapsed);
  });
});
