import { expect, test } from './support/fixtures';

test.describe('Light Jak and Dark Jak', () => {
  test('a meter that is not full cannot transform', async ({ game }) => {
    await game.startRun({ god: true, eco: 50 });
    await game.press('e');
    await game.press('q');
    await game.play(0.5);

    expect((await game.snapshot()).eco.active).toBeNull();
  });

  test('Light Jak powers spend light eco and show a countdown', async ({ game }) => {
    await game.startRun({ god: true, eco: 100 });
    await game.play(0.5);

    await game.press('e');
    const light = await game.waitUntil((s) => s.eco.active === 'light', { message: 'Light Jak' });

    await game.press('4');
    const flying = await game.waitUntil((s) => s.timers.some((t) => t.label.startsWith('Light Flight')), {
      message: 'the Light Flight countdown',
    });
    expect(flying.eco.light, 'Light Flight costs 20 eco').toBeLessThanOrEqual(light.eco.light - 20);
    expect(flying.eco.dark, 'the dark meter is separate').toBe(100);
    expect(flying.timers.map((t) => t.label)).toContain('Light Jak');
  });

  test('the Dark Bomb clears the enemies around Jak and ends Dark Jak', async ({ game }) => {
    await game.startRun({ god: true, eco: 100, t: 200 });
    // Enemies spawn off-screen: wait until several are inside the bomb's 360px radius
    const near = (s: { player: { x: number; y: number }; enemies: { x: number; y: number }[] }) =>
      s.enemies.filter((e) => Math.hypot(e.x - s.player.x, e.y - s.player.y) < 250).length;
    const crowd = await game.waitUntil((s) => s.state === 'playing' && near(s) >= 5, { message: 'a crowd around Jak' });

    await game.press('q');
    await game.waitUntil((s) => s.eco.active === 'dark', { message: 'Dark Jak' });
    await game.press('1');

    const after = await game.waitUntil((s) => s.eco.active === null, { message: 'Dark Jak to end' });
    expect(after.eco.dark).toBe(0);
    expect(after.kills).toBeGreaterThan(crowd.kills);
  });
});
